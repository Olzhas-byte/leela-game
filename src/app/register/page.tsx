"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Ошибка регистрации");
      setLoading(false);
      return;
    }

    // Авто-вход после регистрации
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <Link href="/" className="text-3xl font-serif text-[#d4a853] tracking-widest block">
            लीला
          </Link>
          <h1 className="text-xl font-serif text-[#e8ecf5]">Регистрация</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-[#7b8099] uppercase tracking-widest">
              Имя (необязательно)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full bg-[#0d0f1a] border border-[#1a1d30] rounded-sm px-4 py-3
                         text-[#e8ecf5] placeholder-[#7b8099] focus:outline-none
                         focus:border-[#d4a853] transition-colors"
              placeholder="Как вас называть"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#7b8099] uppercase tracking-widest">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#0d0f1a] border border-[#1a1d30] rounded-sm px-4 py-3
                         text-[#e8ecf5] placeholder-[#7b8099] focus:outline-none
                         focus:border-[#d4a853] transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#7b8099] uppercase tracking-widest">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full bg-[#0d0f1a] border border-[#1a1d30] rounded-sm px-4 py-3
                         text-[#e8ecf5] placeholder-[#7b8099] focus:outline-none
                         focus:border-[#d4a853] transition-colors"
              placeholder="Не менее 6 символов"
            />
          </div>

          {error && (
            <p className="text-[#b04a4a] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#d4a853] text-[#08090f] rounded-sm
                       font-serif font-semibold tracking-wide
                       hover:bg-[#e0bc78] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Создаём аккаунт…" : "Начать игру"}
          </button>
        </form>

        <p className="text-center text-sm text-[#7b8099]">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-[#d4a853] hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}
