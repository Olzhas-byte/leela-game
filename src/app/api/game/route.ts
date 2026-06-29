import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  intention: z.string().min(1, "Намерение не может быть пустым").max(500),
  honest: z.literal(true, {
    errorMap: () => ({ message: "Необходимо подтвердить готовность играть честно" }),
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const game = await prisma.game.create({
    data: {
      userId: session.user.id,
      intention: parsed.data.intention.trim(),
      status: "awaiting_entry",
      position: 0,
      previousPosition: 0,
    },
  });

  return NextResponse.json({ id: game.id }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const games = await prisma.game.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      intention: true,
      status: true,
      position: true,
      createdAt: true,
      finishedAt: true,
      _count: { select: { moves: true } },
    },
  });

  return NextResponse.json(games);
}
