import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyRoll, rollDice, isValidDice } from "@/game/rules";
import { buildTurnContext } from "@/llm/buildContext";
import { interpretTurn, interpretTurnOnce } from "@/llm/client";
import { getCell } from "@/game/board";
import type { GameState, Move } from "@/game/engine";

interface Player {
  name: string;
  position: number;
  status: string;
}

const schema = z.discriminatedUnion("diceSource", [
  z.object({ diceSource: z.literal("auto") }),
  z.object({ diceSource: z.literal("player"), dice: z.number().int().min(1).max(6) }),
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные броска" }, { status: 400 });
  }

  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id },
    include: { moves: { orderBy: { index: "asc" } } },
  });

  if (!game) return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  if (game.userId !== session.user.id)
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  if (game.status === "finished")
    return NextResponse.json({ error: "Партия уже завершена" }, { status: 400 });

  // ── Определяем текущего игрока ───────────────────────────────────────────────
  const players = (game.players as unknown as Player[]) ?? [];
  const isMultiplayer = players.length > 1;
  const currentPlayerIndex = game.currentPlayerIndex;
  const currentPlayer = players[currentPlayerIndex];
  const currentPlayerName = currentPlayer?.name ?? "Игрок";
  const currentPlayerPosition = isMultiplayer ? (currentPlayer?.position ?? 0) : game.position;

  // ── Бросок ──────────────────────────────────────────────────────────────────
  const dice =
    parsed.data.diceSource === "auto" ? rollDice() : parsed.data.dice;

  if (!isValidDice(dice)) {
    return NextResponse.json({ error: "Некорректное число кубика" }, { status: 400 });
  }

  const result = applyRoll(currentPlayerPosition, dice);
  const newIndex = game.moves.length + 1;

  // ── Обновляем массив игроков ─────────────────────────────────────────────────
  let updatedPlayers = players;
  if (isMultiplayer && players.length > 0) {
    updatedPlayers = players.map((p, i) => {
      if (i !== currentPlayerIndex) return p;
      return {
        ...p,
        position: result.toPosition,
        status: result.finished
          ? "finished"
          : result.event === "awaiting_entry"
          ? "awaiting_entry"
          : "in_progress",
      };
    });
  }

  // ── Следующий ход ─────────────────────────────────────────────────────────────
  let nextPlayerIndex = currentPlayerIndex;
  if (!result.extraTurn && !result.finished && isMultiplayer) {
    nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  }

  // ── Статус игры ───────────────────────────────────────────────────────────────
  const newStatus =
    result.finished
      ? "finished"
      : !isMultiplayer && result.event === "awaiting_entry"
      ? "awaiting_entry"
      : "in_progress";

  // ── Сохраняем ход ────────────────────────────────────────────────────────────
  const move = await prisma.move.create({
    data: {
      gameId: id,
      index: newIndex,
      dice,
      diceSource: parsed.data.diceSource,
      event: result.event,
      fromPosition: result.fromPosition,
      landedPosition: result.landedPosition,
      toPosition: result.toPosition,
      transitionType: result.transition?.type ?? null,
      transitionTo: result.transition?.to ?? null,
      cellNumber: result.cellNumber,
      playerIndex: currentPlayerIndex,
    },
  });

  // ── Обновляем партию ─────────────────────────────────────────────────────────
  await prisma.game.update({
    where: { id },
    data: {
      position: isMultiplayer ? game.position : result.toPosition,
      previousPosition: isMultiplayer ? game.previousPosition : result.fromPosition,
      players: updatedPlayers as unknown as Prisma.InputJsonValue,
      currentPlayerIndex: nextPlayerIndex,
      status: newStatus,
      finishedAt: result.finished ? new Date() : undefined,
    },
  });

  // ── Контекст для LLM ─────────────────────────────────────────────────────────
  const gameState: GameState = {
    id: game.id,
    userId: game.userId,
    intention: game.intention,
    status: newStatus,
    position: result.toPosition,
    previousPosition: result.fromPosition,
    history: game.moves.map((m) => ({
      index: m.index,
      dice: m.dice,
      diceSource: m.diceSource as "player" | "auto",
      result: {
        event: m.event as Move["result"]["event"],
        fromPosition: m.fromPosition,
        landedPosition: m.landedPosition,
        toPosition: m.toPosition,
        cellNumber: m.cellNumber,
        transition: m.transitionType
          ? { type: m.transitionType as "arrow" | "snake", from: m.landedPosition, to: m.transitionTo!, quality: "" }
          : null,
        extraTurn: false,
        finished: m.event === "win",
      },
      interpretation: m.interpretation ?? undefined,
      createdAt: m.createdAt.toISOString(),
    })),
    createdAt: game.createdAt.toISOString(),
  };

  const currentMove: Move = {
    index: newIndex,
    dice,
    diceSource: parsed.data.diceSource,
    result,
    createdAt: move.createdAt.toISOString(),
  };

  gameState.history.push(currentMove);

  const baseContext = buildTurnContext(gameState, currentMove);
  const userContext = isMultiplayer
    ? `ИГРОК: ${currentPlayerName}\n\n${baseContext}`
    : baseContext;

  // ── SSE-стрим ────────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let fullInterpretation = "";

  const metadata = {
    type: "meta",
    dice,
    playerIndex: currentPlayerIndex,
    playerName: currentPlayerName,
    nextPlayerIndex,
    players: updatedPlayers,
    result: {
      event: result.event,
      fromPosition: result.fromPosition,
      landedPosition: result.landedPosition,
      toPosition: result.toPosition,
      cellNumber: result.cellNumber,
      cellName: result.cellNumber ? getCell(result.cellNumber).name : null,
      transition: result.transition
        ? { type: result.transition.type, from: result.transition.from, to: result.transition.to }
        : null,
      extraTurn: result.extraTurn,
      finished: result.finished,
    },
    moveId: move.id,
  };

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));

      // awaiting_entry — игрок ещё не на доске, трактовка не нужна
      if (result.event !== "awaiting_entry") {
        try {
          await interpretTurn({
            userContext,
            onToken(chunk) {
              fullInterpretation += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", text: chunk })}\n\n`)
              );
            },
            signal: undefined,
          });
        } catch {
          try {
            fullInterpretation = await interpretTurnOnce(userContext);
          } catch {
            fullInterpretation = "Трактовка временно недоступна. Продолжайте игру.";
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "token", text: fullInterpretation })}\n\n`)
          );
        }

        await prisma.move.update({
          where: { id: move.id },
          data: { interpretation: fullInterpretation },
        });
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
