"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGameForm() {
  const router = useRouter();
  const [intention, setIntention] = useState("");
  const [honest, setHonest] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canStart = intention.trim().length > 0 && honest;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canStart) return;

    setError("");
    setLoading(true);

    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intention: intention.trim(), honest: true }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Ошибка создания партии");
      setLoading(false);
      return;
    }

    const { id } = await res.json();
    router.push(`/game/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-[#7b8099] uppercase tracking-widest">
          Намерение
        </label>
        <textarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Что вы хотите исследовать в этой игре?"
          className="w-full bg-[#131626] border border-[#1a1d30] rounded-sm px-4 py-3
                     text-[#e8ecf5] placeholder-[#7b8099] focus:outline-none
                     focus:border-[#d4a853] transition-colors resize-none
                     font-serif text-sm leading-relaxed"
        />
        <p className="text-right text-xs text-[#7b8099]">
          {intention.length}/500
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            checked={honest}
            onChange={(e) => setHonest(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-4 h-4 rounded-sm border transition-colors ${
              honest
                ? "bg-[#d4a853] border-[#d4a853]"
                : "border-[#1a1d30] bg-[#131626] group-hover:border-[#d4a853]/50"
            } flex items-center justify-center`}
          >
            {honest && (
              <svg className="w-2.5 h-2.5 text-[#08090f]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-[#c8cde0] leading-relaxed">
          Я готов(а) играть честно — смотреть на то, что есть, а не на то,
          что хотелось бы видеть
        </span>
      </label>

      {error && <p className="text-[#b04a4a] text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!canStart || loading}
        className="w-full py-3 bg-[#d4a853] text-[#08090f] rounded-sm
                   font-serif font-semibold tracking-wide
                   hover:bg-[#e0bc78] transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {loading ? "Открываем игру…" : "Начать партию"}
      </button>
    </form>
  );
}
