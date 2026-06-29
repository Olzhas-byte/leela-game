"use client";

import { useState, useCallback } from "react";
import Board from "@/components/Board";
import GuideFeed from "@/components/GuideFeed";
import DicePanel from "@/components/DicePanel";
import Link from "next/link";
import { getCell } from "@/game/board";

interface Move {
  id: string;
  index: number;
  dice: number;
  event: string;
  cellNumber: number | null;
  interpretation?: string | null;
  fromPosition: number;
  toPosition: number;
}

interface Game {
  id: string;
  intention: string;
  status: string;
  position: number;
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
}

export default function GameClient({ game: initialGame }: Props) {
  const [position, setPosition] = useState(initialGame.position);
  const [status, setStatus] = useState(initialGame.status);
  const [extraTurn, setExtraTurn] = useState(false);
  const [rolling, setRolling] = useState(false);

  const [feed, setFeed] = useState<FeedEntry[]>(
    initialGame.moves.map((m) => ({
      index: m.index,
      dice: m.dice,
      event: m.event,
      cellNumber: m.cellNumber,
      interpretation: m.interpretation ?? undefined,
    }))
  );

  const historyForBoard = initialGame.moves.map((m) => ({
    cellNumber: m.cellNumber,
  }));

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
            newIndex = feed.length + 1;

            setPosition(r.toPosition);
            if (metaFinished) setStatus("finished");

            // Добавляем заготовку в ленту (без текста — будем стримить)
            setFeed((prev) => [
              ...prev,
              {
                index: newIndex,
                dice: metaDice,
                event: metaEvent,
                cellNumber: metaCellNumber,
                isStreaming: true,
                streamText: "",
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
    [rolling, status, feed, initialGame.id]
  );

  const currentCell = position > 0 ? getCell(position) : null;
  const isFinished = status === "finished";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Верхняя навигация */}
      <header className="border-b border-[#1a1d30] px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-[#7b8099] text-sm hover:text-[#c8cde0] transition-colors">
          ← К партиям
        </Link>
        <span className="text-[#d4a853] font-serif text-lg">लीला</span>
        <span className="text-[#7b8099] text-xs">
          {isFinished ? "Завершена" : `Клетка ${position === 0 ? "—" : position}`}
        </span>
      </header>

      {/* Намерение */}
      <div className="bg-[#0d0f1a] border-b border-[#1a1d30] px-4 py-3">
        <p className="text-xs text-[#7b8099] uppercase tracking-widest mb-1">Намерение</p>
        <p className="text-[#e8ecf5] font-serif text-sm leading-relaxed line-clamp-2">
          {initialGame.intention}
        </p>
      </div>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-6 lg:p-6 p-0">
        {/* Левая панель: доска + кубик */}
        <aside className="lg:w-[480px] lg:flex-shrink-0 flex flex-col gap-4 p-4 lg:p-0">
          <Board position={position} history={feed} />

          {/* Текущая клетка */}
          {currentCell && !isFinished && (
            <div className="bg-[#0d0f1a] border border-[#1a1d30] rounded-sm p-3 text-center">
              <p className="text-xs text-[#7b8099] uppercase tracking-widest mb-1">
                Текущая клетка
              </p>
              <p className="font-serif text-[#e8ecf5]">
                {currentCell.number}. {currentCell.name}
              </p>
              {currentCell.sanskrit && (
                <p className="text-xs text-[#7b8099] mt-0.5">{currentCell.sanskrit}</p>
              )}
            </div>
          )}

          {/* Кубик */}
          {!isFinished && (
            <div className="bg-[#0d0f1a] border border-[#1a1d30] rounded-sm p-4">
              <DicePanel
                onRoll={handleRoll}
                disabled={rolling}
                extraTurn={extraTurn}
              />
            </div>
          )}

          {/* Финальный экран */}
          {isFinished && (
            <div className="bg-[#0d0f1a] border border-[#5d9e8e]/40 rounded-sm p-6 text-center space-y-3">
              <div className="text-3xl">☯</div>
              <p className="font-serif text-[#73b8a6] text-lg">
                Космическое сознание
              </p>
              <p className="text-[#7b8099] text-sm leading-relaxed">
                Вы прошли все 72 клетки. Партия завершена.
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

        {/* Правая панель: лента ведущего */}
        <section className="flex-1 overflow-y-auto p-4 lg:p-0 space-y-2">
          <p className="text-xs text-[#7b8099] uppercase tracking-widest mb-3">
            Ведущий
          </p>
          <GuideFeed moves={feed} intention={initialGame.intention} />
        </section>
      </div>
    </div>
  );
}
