"use client";

import { useState } from "react";

interface Props {
  onRoll: (source: "auto" | "player", dice?: number) => Promise<void> | void;
  disabled: boolean;
  extraTurn?: boolean;
  awaitingEntry?: boolean;
}

const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export default function DicePanel({ onRoll, disabled, extraTurn, awaitingEntry }: Props) {
  const [mode, setMode] = useState<"auto" | "player">("auto");
  const [playerDice, setPlayerDice] = useState<number | "">("");
  const [rolling, setRolling] = useState(false);
  const [lastDice, setLastDice] = useState<number | null>(null);

  async function handleRoll() {
    if (disabled || rolling) return;

    if (mode === "player") {
      const n = Number(playerDice);
      if (!n || n < 1 || n > 6) return;
      setRolling(true);
      setLastDice(n);
      await onRoll("player", n);
      setPlayerDice("");
      setRolling(false);
    } else {
      setRolling(true);
      await onRoll("auto");
      setRolling(false);
    }
  }

  return (
    <div className="space-y-4">
      {awaitingEntry && (
        <div className="bg-[#d4a85318] border border-[#d4a853]/40 rounded-sm px-4 py-3 text-center space-y-1">
          <p className="text-[#d4a853] text-sm font-serif">
            Для входа в игру нужно выбросить <strong>6</strong>
          </p>
          <p className="text-[#7b8099] text-xs">
            Бросайте кубик — 6 откроет путь на доску
          </p>
        </div>
      )}
      {extraTurn && (
        <p className="text-center text-[#d4a853] text-xs uppercase tracking-widest animate-pulse">
          Дополнительный ход за выпавшую 6!
        </p>
      )}

      {/* Последний кубик */}
      {lastDice && (
        <div className="text-center">
          <span
            className="text-5xl select-none"
            style={{ color: "#d4a853" }}
          >
            {DICE_FACES[lastDice]}
          </span>
        </div>
      )}

      {/* Выбор режима */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("auto")}
          className={`flex-1 py-2 text-sm rounded-sm border transition-colors ${
            mode === "auto"
              ? "border-[#d4a853] text-[#d4a853] bg-[#d4a85315]"
              : "border-[#1a1d30] text-[#7b8099] hover:border-[#222640]"
          }`}
        >
          Сгенерировать
        </button>
        <button
          onClick={() => setMode("player")}
          className={`flex-1 py-2 text-sm rounded-sm border transition-colors ${
            mode === "player"
              ? "border-[#d4a853] text-[#d4a853] bg-[#d4a85315]"
              : "border-[#1a1d30] text-[#7b8099] hover:border-[#222640]"
          }`}
        >
          Бросить сам(а)
        </button>
      </div>

      {/* Ввод числа */}
      {mode === "player" && (
        <div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setPlayerDice(n)}
                className={`w-10 h-10 rounded-sm border text-lg transition-colors ${
                  playerDice === n
                    ? "border-[#d4a853] text-[#d4a853] bg-[#d4a85315]"
                    : "border-[#1a1d30] text-[#7b8099] hover:border-[#222640]"
                }`}
              >
                {DICE_FACES[n]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Кнопка броска */}
      <button
        onClick={handleRoll}
        disabled={disabled || rolling || (mode === "player" && !playerDice)}
        className="w-full py-3 bg-[#d4a853] text-[#08090f] rounded-sm
                   font-serif font-semibold tracking-wide text-base
                   hover:bg-[#e0bc78] transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed
                   active:scale-[0.98]"
      >
        {rolling ? "…" : "Бросить кубик"}
      </button>
    </div>
  );
}
