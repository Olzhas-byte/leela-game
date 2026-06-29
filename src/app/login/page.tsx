"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Неверный email или пароль");
      return;
    }

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
          <h1 className="text-xl font-serif text-[#e8ecf5]">Вход</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
              className="w-full bg-[#0d0f1a] border border-[#1a1d30] rounded-sm px-4 py-3
                         text-[#e8ecf5] placeholder-[#7b8099] focus:outline-none
                         focus:border-[#d4a853] transition-colors"
              placeholder="••••••••"
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
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>

        <p className="text-center text-sm text-[#7b8099]">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-[#d4a853] hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </main>
  );
}
