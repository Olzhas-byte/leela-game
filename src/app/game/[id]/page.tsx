import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import GameClient from "./GameClient";

interface Player {
  name: string;
  position: number;
  status: string;
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
          event: true,
          fromPosition: true,
          landedPosition: true,
          toPosition: true,
          cellNumber: true,
          interpretation: true,
          transitionType: true,
          transitionTo: true,
          playerIndex: true,
        },
      },
    },
  });

  if (!game) notFound();
  if (game.userId !== session.user.id) notFound();

  const players = (game.players as unknown as Player[]) ?? [];

  return (
    <GameClient
      game={{
        id: game.id,
        intention: game.intention,
        status: game.status,
        position: game.position,
        players,
        currentPlayerIndex: game.currentPlayerIndex,
        moves: game.moves.map((m) => ({
          id: m.id,
          index: m.index,
          dice: m.dice,
          event: m.event,
          fromPosition: m.fromPosition,
          toPosition: m.toPosition,
          cellNumber: m.cellNumber,
          interpretation: m.interpretation ?? undefined,
          playerIndex: m.playerIndex,
        })),
      }}
    />
  );
}
