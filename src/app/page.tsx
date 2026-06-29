import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Логотип */}
        <div className="space-y-2">
          <div className="text-5xl font-serif text-[#d4a853] tracking-widest">लीला</div>
          <h1 className="text-3xl font-serif text-[#e8ecf5] tracking-wide">Лила</h1>
          <p className="text-[#7b8099] text-sm tracking-widest uppercase">
            Игра самопознания
          </p>
        </div>

        {/* Описание */}
        <div className="text-[#c8cde0] space-y-3 text-base leading-relaxed font-serif">
          <p>
            Классическая индийская игра «Лила» — символическая карта сознания.
            72 клетки, каждая из которых отражает состояние, через которое
            проходит душа на пути к себе.
          </p>
          <p className="text-[#7b8099]">
            Змеи уводят вниз. Стрелы поднимают вверх.
            Намерение остаётся осью.
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 border border-[#d4a853] text-[#d4a853] rounded-sm
                       hover:bg-[#d4a853] hover:text-[#08090f] transition-colors
                       font-serif tracking-wide"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 bg-[#d4a853] text-[#08090f] rounded-sm
                       hover:bg-[#e0bc78] transition-colors
                       font-serif tracking-wide font-semibold"
          >
            Начать игру
          </Link>
        </div>

        <p className="text-[#7b8099] text-xs">
          Игра для тех, кто готов смотреть честно
        </p>
      </div>
    </main>
  );
}
