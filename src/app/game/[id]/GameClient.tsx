"use client";

import { useState, useCallback } from "react";
import Board from "@/components/Board";
import GuideFeed from "@/components/GuideFeed";
import DicePanel from "@/components/DicePanel";
import Link from "next/link";
import { getCell } from "@/game/board";

export const PLAYER_COLORS = [
  "#d4a853",
  "#b04a4a",
  "#5d9e8e",
  "#8b6eb5",
  "#4a7cb8",
  "#9e7a5d",
];

interface Player {
  name: string;
  position: number;
  status: string;
}

interface Move {
  id: string;
  index: number;
  dice: number;
  event: string;
  cellNumber: number | null;
  interpretation?: string | null;
  fromPosition: number;
  toPosition: number;
  playerIndex: number;
}

interface Game {
  id: string;
  intention: string;
  status: string;
  position: number;
  players: Player[];
  currentPlayerIndex: number;
  moves: Move[];
}

interface Props {
  game: Game;
}

interface FeedEntry {
  index: number;
  dice: number;
  event: string;
  cellNumber: number | null;
  interpretation?: string;
  isStreaming?: boolean;
  streamText?: string;
  playerIndex: number;
  playerName: string;
  playerColor: string;
}

export default function GameClient({ game: initialGame }: Props) {
  const isMultiplayer = initialGame.players.length > 1;

  const [position, setPosition] = useState(initialGame.position);
  const [status, setStatus] = useState(initialGame.status);
  const [extraTurn, setExtraTurn] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [players, setPlayers] = useState<Player[]>(initialGame.players);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(
    initialGame.currentPlayerIndex
  );

  const getPlayerName = (idx: number, pList: Player[]) =>
    pList[idx]?.name ?? "Игрок";
  const getPlayerColor = (idx: number) =>
    PLAYER_COLORS[idx % PLAYER_COLORS.length];

  const [feed, setFeed] = useState<FeedEntry[]>(
    initialGame.moves.map((m) => ({
      index: m.index,
      dice: m.dice,
      event: m.event,
      cellNumber: m.cellNumber,
      interpretation: m.interpretation ?? undefined,
      playerIndex: m.playerIndex,
      playerName: getPlayerName(m.playerIndex, initialGame.players),
      playerColor: getPlayerColor(m.playerIndex),
    }))
  );

  const handleRoll = useCallback(
    async (source: "auto" | "player", dice?: number) => {
      if (rolling || status === "finished") return;
      setRolling(true);
      setExtraTurn(false);

      const body =
        source === "auto"
          ? { diceSource: "auto" }
          : { diceSource: "player", dice };

      const res = await fetch(`/api/game/${initialGame.id}/roll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        setRolling(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let metaDice = dice ?? 0;
      let metaEvent = "normal";
      let metaCellNumber: number | null = null;
      let metaExtraTurn = false;
      let metaFinished = false;
      let metaPlayerIndex = currentPlayerIndex;
      let metaPlayerName = getPlayerName(currentPlayerIndex, players);
      let metaPlayerColor = getPlayerColor(currentPlayerIndex);
      let newIndex = feed.length + 1;

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(raw);
          } catch {
            continue;
          }

          if (payload.type === "meta") {
            const r = payload.result as {
              event: string;
              toPosition: number;
              cellNumber: number | null;
              extraTurn: boolean;
              finished: boolean;
            };
            metaDice = payload.dice as number;
            metaEvent = r.event;
            metaCellNumber = r.cellNumber;
            metaExtraTurn = r.extraTurn;
            metaFinished = r.finished;
            metaPlayerIndex = payload.playerIndex as number;
            metaPlayerName = payload.playerName as string;
            metaPlayerColor = getPlayerColor(metaPlayerIndex);
            newIndex = feed.length + 1;

            const nextIdx = payload.nextPlayerIndex as number;
            const updatedPlayers = payload.players as Player[];

            if (isMultiplayer) {
              setPlayers(updatedPlayers);
              setCurrentPlayerIndex(metaExtraTurn ? metaPlayerIndex : nextIdx);
            } else {
              setPosition(r.toPosition);
            }

            if (metaFinished) setStatus("finished");

            setFeed((prev) => [
              ...prev,
              {
                index: newIndex,
                dice: metaDice,
                event: metaEvent,
                cellNumber: metaCellNumber,
                isStreaming: true,
                streamText: "",
                playerIndex: metaPlayerIndex,
                playerName: metaPlayerName,
                playerColor: metaPlayerColor,
              },
            ]);
          } else if (payload.type === "token") {
            const chunk = payload.text as string;
            setFeed((prev) =>
              prev.map((e) =>
                e.index === newIndex
                  ? { ...e, streamText: (e.streamText ?? "") + chunk }
                  : e
              )
            );
          } else if (payload.type === "done") {
            setFeed((prev) =>
              prev.map((e) =>
                e.index === newIndex
                  ? {
                      ...e,
                      isStreaming: false,
                      interpretation: e.streamText,
                      streamText: undefined,
                    }
                  : e
              )
            );
            setExtraTurn(metaExtraTurn);
          }
        }
      }

      setRolling(false);
    },
    [rolling, status, feed, initialGame.id, currentPlayerIndex, players, isMultiplayer]
  );

  const currentPosition = isMultiplayer
    ? players[currentPlayerIndex]?.position ?? 0
    : position;
  const currentCell = currentPosition > 0 ? getCell(currentPosition) : null;
  const isFinished = status === "finished";
  const currentPlayer = isMultiplayer ? players[currentPlayerIndex] : null;

  const playerMarkers = isMultiplayer
    ? players.map((p, i) => ({
        position: p.position,
        color: getPlayerColor(i),
        name: p.name,
        isActive: i === currentPlayerIndex,
      }))
    : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[#1a1d30] px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-[#7b8099] text-sm hover:text-[#c8cde0] transition-colors">
          ← К партиям
        </Link>
        <span className="text-[#d4a853] font-serif text-lg">लीला</span>
        <span className="text-[#7b8099] text-xs">
          {isFinished
            ? "Завершена"
            : isMultiplayer
            ? `Ход: ${currentPlayer?.name ?? "—"}`
            : `Клетка ${currentPosition === 0 ? "—" : currentPosition}`}
        </span>
      </header>

      <div className="bg-[#0d0f1a] border-b border-[#1a1d30] px-4 py-3">
        <p className="text-xs text-[#7b8099] uppercase tracking-widest mb-1">Намерение</p>
        <p className="text-[#e8ecf5] font-serif text-sm leading-relaxed line-clamp-2">
          {initialGame.intention}
        </p>
      </div>

      {/* Панель игроков (мультиплеер) */}
      {isMultiplayer && (
        <div className="border-b border-[#1a1d30] px-4 py-2 flex gap-3 overflow-x-auto">
          {players.map((p, i) => {
            const color = getPlayerColor(i);
            const isCurrent = i === currentPlayerIndex && !isFinished;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-sm whitespace-nowrap transition-all ${
                  isCurrent
                    ? "border-opacity-100 bg-opacity-10"
                    : "border-[#1a1d30] opacity-60"
                }`}
                style={{
                  borderColor: isCurrent ? color : undefined,
                  backgroundColor: isCurrent ? `${color}15` : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span style={{ color: isCurrent ? color : "#c8cde0" }}>
                  {p.name}
                </span>
                <span className="text-[#7b8099] text-xs">
                  {p.position === 0 ? "—" : `кл. ${p.position}`}
                </span>
                {p.status === "finished" && (
                  <span className="text-xs" style={{ color }}>★</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-6 lg:p-6 p-0">
        <aside className="lg:w-[480px] lg:flex-shrink-0 flex flex-col gap-4 p-4 lg:p-0">
          <Board
            position={isMultiplayer ? 0 : currentPosition}
            history={feed}
            playerMarkers={playerMarkers}
          />

          {currentCell && !isFinished && (
            <div className="bg-[#0d0f1a] border border-[#1a1d30] rounded-sm p-3 text-center">
              <p className="text-xs text-[#7b8099] uppercase tracking-widest mb-1">
                {isMultiplayer ? `${currentPlayer?.name} — текущая клетка` : "Текущая клетка"}
              </p>
              <p className="font-serif text-[#e8ecf5]">
                {currentCell.number}. {currentCell.name}
              </p>
              {currentCell.sanskrit && (
                <p className="text-xs text-[#7b8099] mt-0.5">{currentCell.sanskrit}</p>
              )}
            </div>
          )}

          {!isFinished && (
            <div className="bg-[#0d0f1a] border border-[#1a1d30] rounded-sm p-4">
              {isMultiplayer && currentPlayer && (
                <p
                  className="text-center text-xs uppercase tracking-widest mb-3"
                  style={{ color: getPlayerColor(currentPlayerIndex) }}
                >
                  Бросает {currentPlayer.name}
                </p>
              )}
              <DicePanel
                onRoll={handleRoll}
                disabled={rolling}
                extraTurn={extraTurn}
                awaitingEntry={currentPosition === 0}
              />
            </div>
          )}

          {isFinished && (
            <div className="bg-[#0d0f1a] border border-[#5d9e8e]/40 rounded-sm p-6 text-center space-y-3">
              <div className="text-3xl">☯</div>
              <p className="font-serif text-[#73b8a6] text-lg">Космическое сознание</p>
              <p className="text-[#7b8099] text-sm leading-relaxed">
                {isMultiplayer
                  ? `${players.find((p) => p.status === "finished")?.name ?? "Игрок"} достиг цели. Партия завершена.`
                  : "Вы прошли все 72 клетки. Партия завершена."}
              </p>
              <Link
                href="/dashboard"
                className="inline-block mt-2 px-6 py-2.5 border border-[#5d9e8e]
                           text-[#73b8a6] rounded-sm text-sm
                           hover:bg-[#5d9e8e20] transition-colors"
              >
                Начать новую партию
              </Link>
            </div>
          )}
        </aside>

        <section className="flex-1 overflow-y-auto p-4 lg:p-0 space-y-2">
          <p className="text-xs text-[#7b8099] uppercase tracking-widest mb-3">Ведущий</p>
          <GuideFeed
            moves={feed}
            intention={initialGame.intention}
            isMultiplayer={isMultiplayer}
          />
        </section>
      </div>
    </div>
  );
}
