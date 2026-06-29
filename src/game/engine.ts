/**
 * Движок: применяет ход к состоянию партии и ведёт историю.
 * Состояние здесь — простой объект; персистентность (Prisma/Postgres) — отдельно.
 */
import { applyRoll, isValidDice, rollDice, type MoveResult, type RollSource } from './rules';

export type GameStatus =
  | 'awaiting_intention'
  | 'awaiting_entry'
  | 'in_progress'
  | 'finished';

export interface Move {
  index: number;
  dice: number;
  diceSource: RollSource;
  result: MoveResult;
  /** Текст трактовки от LLM (заполняется после стрима). */
  interpretation?: string;
  createdAt: string; // ISO
}

export interface GameState {
  id: string;
  userId: string;
  intention: string;
  status: GameStatus;
  position: number;        // 0 = вне доски
  previousPosition: number;
  history: Move[];
  createdAt: string;
  finishedAt?: string;
}

export function createGame(params: {
  id: string;
  userId: string;
  intention: string;
}): GameState {
  const intention = params.intention.trim();
  // Правило промта: без намерения игра не начинается.
  if (!intention) {
    throw new Error('Намерение не может быть пустым — без него игра не начинается.');
  }
  const now = new Date().toISOString();
  return {
    id: params.id,
    userId: params.userId,
    intention,
    status: 'awaiting_entry',
    position: 0,
    previousPosition: 0,
    history: [],
    createdAt: now,
  };
}

/**
 * Выполняет один ход. Мутирует и возвращает новое состояние + результат.
 * diceValue передаётся, если игрок бросает кубик сам; иначе генерируется сервером.
 */
export function takeTurn(
  state: GameState,
  diceSource: RollSource,
  diceValue?: number,
): { state: GameState; move: Move } {
  if (state.status === 'finished') {
    throw new Error('Партия уже завершена.');
  }

  const dice =
    diceSource === 'player'
      ? requireValidDice(diceValue)
      : rollDice();

  const result = applyRoll(state.position, dice);

  // Обновление состояния.
  state.previousPosition = result.fromPosition;
  state.position = result.toPosition;

  if (result.finished) {
    state.status = 'finished';
    state.finishedAt = new Date().toISOString();
  } else if (result.event === 'awaiting_entry') {
    state.status = 'awaiting_entry';
  } else {
    state.status = 'in_progress';
  }

  const move: Move = {
    index: state.history.length + 1,
    dice,
    diceSource,
    result,
    createdAt: new Date().toISOString(),
  };
  state.history.push(move);

  return { state, move };
}

/** Записать текст трактовки в последний ход (после получения от LLM). */
export function attachInterpretation(state: GameState, text: string): void {
  const last = state.history[state.history.length - 1];
  if (last) last.interpretation = text;
}

function requireValidDice(n?: number): number {
  if (n === undefined || !isValidDice(n)) {
    throw new Error('Некорректное число кубика. Ожидается целое от 1 до 6.');
  }
  return n;
}
