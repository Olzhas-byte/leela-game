-- AlterTable: add multiplayer fields to Game
ALTER TABLE "Game" ADD COLUMN "players" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Game" ADD COLUMN "currentPlayerIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: add playerIndex to Move
ALTER TABLE "Move" ADD COLUMN "playerIndex" INTEGER NOT NULL DEFAULT 0;
