import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      moves: {
        orderBy: { index: "asc" },
        select: {
          id: true,
          index: true,
          dice: true,
          diceSource: true,
          event: true,
          fromPosition: true,
          landedPosition: true,
          toPosition: true,
          transitionType: true,
          transitionTo: true,
          cellNumber: true,
          interpretation: true,
          createdAt: true,
        },
      },
    },
  });

  if (!game) return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  if (game.userId !== session.user.id) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(game);
}
