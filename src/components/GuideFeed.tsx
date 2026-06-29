"use client";

import { useEffect, useRef } from "react";
import { getCell } from "@/game/board";

interface MoveEntry {
  index: number;
  dice: number;
  event: string;
  cellNumber: number | null;
  interpretation?: string;
  isStreaming?: boolean;
  streamText?: string;
  playerName?: string;
  playerColor?: string;
}

interface Props {
  moves: MoveEntry[];
  intention: string;
  isMultiplayer?: boolean;
}

function eventLabel(event: string, cellNumber: number | null): string {
  switch (event) {
    case "awaiting_entry": return "Ожидание входа в игру";
    case "entry": return `Рождение → клетка ${cellNumber}`;
    case "arrow": return `Стрела ↑ → клетка ${cellNumber}`;
    case "snake": return `Змея ↓ → клетка ${cellNumber}`;
    case "overshoot": return "Перелёт — ход не вместился";
    case "win": return "Достижение цели";
    default: return `Клетка ${cellNumber}`;
  }
}

function eventColor(event: string): string {
  if (event === "arrow") return "text-[#73b8a6]";
  if (event === "snake") return "text-[#c96060]";
  if (event === "win") return "text-[#d4a853]";
  return "text-[#7b8099]";
}

export default function GuideFeed({ moves, intention, isMultiplayer }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const displayed = [...moves].reverse();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves.length]);

  if (moves.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-[#0d0f1a] border border-[#1a1d30] rounded-sm p-5">
          <p className="text-[#7b8099] text-sm font-serif leading-relaxed italic">
            «Бросьте кубик, чтобы начать путь. Намерение ведёт, игра отвечает.»
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayed.map((m) => {
        const cell = m.cellNumber ? getCell(m.cellNumber) : null;
        const text = m.isStreaming ? m.streamText : m.interpretation;
        return (
          <div
            key={m.index}
            className="bg-[#0d0f1a] border border-[#1a1d30] rounded-sm p-5 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#7b8099]">Ход {m.index}</span>
                <span className="text-xs text-[#d4a853]">кубик: {m.dice}</span>
                {isMultiplayer && m.playerName && (
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded-sm"
                    style={{
                      color: m.playerColor,
                      backgroundColor: `${m.playerColor}20`,
                    }}
                  >
                    {m.playerName}
                  </span>
                )}
              </div>
              <span className={`text-xs ${eventColor(m.event)}`}>
                {eventLabel(m.event, m.cellNumber)}
              </span>
            </div>

            {cell && (
              <div className="border-l-2 border-[#d4a853]/40 pl-3">
                <p className="font-serif text-[#e8ecf5]">
                  {cell.number}. {cell.name}
                </p>
                {cell.sanskrit && (
                  <p className="text-xs text-[#7b8099] mt-0.5">{cell.sanskrit}</p>
                )}
              </div>
            )}

            {text ? (
              <div className="guide-text text-sm text-[#c8cde0] leading-relaxed whitespace-pre-wrap font-serif">
                {text}
                {m.isStreaming && (
                  <span className="inline-block w-0.5 h-4 bg-[#d4a853] ml-0.5 animate-pulse align-bottom" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#7b8099] text-sm">
                <span className="inline-block w-1 h-1 rounded-full bg-[#d4a853] animate-bounce" />
                <span className="inline-block w-1 h-1 rounded-full bg-[#d4a853] animate-bounce [animation-delay:0.15s]" />
                <span className="inline-block w-1 h-1 rounded-full bg-[#d4a853] animate-bounce [animation-delay:0.3s]" />
                <span className="ml-1">Ведущий размышляет…</span>
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
