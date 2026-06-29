import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import NewGameForm from "@/components/NewGameForm";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const games = await prisma.game.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { moves: true } } },
  });

  const active = games.filter((g) => g.status !== "finished");
  const finished = games.filter((g) => g.status === "finished");

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto space-y-10">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-serif text-[#d4a853]">लीला</div>
          {session.user.name && (
            <p className="text-[#7b8099] text-sm mt-0.5">
              {session.user.name}
            </p>
          )}
        </div>
        <SignOutButton />
      </div>

      {/* Новая партия */}
      <section className="bg-[#0d0f1a] border border-[#1a1d30] rounded-sm p-6 space-y-4">
        <h2 className="font-serif text-[#e8ecf5] text-lg">Новая партия</h2>
        <p className="text-[#7b8099] text-sm leading-relaxed">
          Сформулируйте намерение — вопрос, ситуацию или область жизни,
          которую хотите исследовать. Намерение станет осью всей игры.
        </p>
        <NewGameForm />
      </section>

      {/* Активные партии */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs text-[#7b8099] uppercase tracking-widest">
            Незавершённые партии
          </h2>
          {active.map((g) => (
            <Link
              key={g.id}
              href={`/game/${g.id}`}
              className="block bg-[#0d0f1a] border border-[#1a1d30] rounded-sm p-4
                         hover:border-[#d4a853]/40 transition-colors group"
            >
              <p className="text-[#e8ecf5] font-serif group-hover:text-[#d4a853] transition-colors line-clamp-2">
                {g.intention}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#7b8099]">
                <span>Ходов: {g._count.moves}</span>
                <span>Клетка: {g.position === 0 ? "вне доски" : g.position}</span>
                <span>{new Date(g.createdAt).toLocaleDateString("ru")}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Завершённые партии */}
      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs text-[#7b8099] uppercase tracking-widest">
            Завершённые партии
          </h2>
          {finished.map((g) => (
            <Link
              key={g.id}
              href={`/game/${g.id}`}
              className="block bg-[#0d0f1a] border border-[#131626] rounded-sm p-4
                         hover:border-[#5d9e8e]/30 transition-colors group opacity-70 hover:opacity-100"
            >
              <p className="text-[#c8cde0] font-serif line-clamp-2">{g.intention}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#7b8099]">
                <span className="text-[#5d9e8e]">Завершена</span>
                <span>Ходов: {g._count.moves}</span>
                {g.finishedAt && (
                  <span>{new Date(g.finishedAt).toLocaleDateString("ru")}</span>
                )}
              </div>
            </Link>
          ))}
        </section>
      )}

      {games.length === 0 && (
        <p className="text-center text-[#7b8099] text-sm py-8">
          Ваши партии появятся здесь
        </p>
      )}
    </main>
  );
}
