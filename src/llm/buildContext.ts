/**
 * Сборка контекста хода для LLM. Код передаёт ведущему ТОЛЬКО выверенные факты
 * (имена клеток, тип события, переход) — модель не считает арифметику и не выдумывает
 * клетки. Имена и опорные смыслы берутся из канона board.ts.
 */
import { getCell } from '../game/board';
import type { GameState, Move } from '../game/engine';
import type { MoveResult } from '../game/rules';

/** Краткая строка истории: "ход N → клетка X «Имя»". */
function formatHistory(history: Move[]): string {
  const past = history.slice(0, -1); // последний ход трактуется сейчас
  if (past.length === 0) return 'ходов ещё не было';
  return past
    .map((m) => {
      const c = m.result.cellNumber;
      if (c == null) return `ход ${m.index} → вне доски (ожидание входа)`;
      return `ход ${m.index} → клетка ${c} «${getCell(c).name}»`;
    })
    .join('; ');
}

function describeEvent(r: MoveResult): string {
  switch (r.event) {
    case 'awaiting_entry':
      return 'СОБЫТИЕ: выпало не 6 — игрок ещё не вошёл в игру (ожидание рождения). Клетку не трактуй; коротко отметь состояние ожидания входа относительно намерения.';
    case 'entry':
      return `СОБЫТИЕ: ВХОД В ИГРУ (рождение) — игрок входит на клетку ${r.toPosition}.`;
    case 'arrow':
      return `СОБЫТИЕ: СТРЕЛА ${r.landedPosition}→${r.toPosition}. Качество подъёма: ${r.transition?.quality}. Объясни подъём по правилам для стрел.`;
    case 'snake':
      return `СОБЫТИЕ: ЗМЕЯ ${r.landedPosition}→${r.toPosition}. Неусвоенный урок: ${r.transition?.quality}. Объясни падение по правилам для змей (не как наказание).`;
    case 'overshoot':
      return 'СОБЫТИЕ: перелёт за край доски — ход не вместился, игрок остаётся на текущей клетке. Можешь кратко отметить смысл «недостаточно точного шага» к цели.';
    case 'win':
      return `СОБЫТИЕ: ТОЧНОЕ ПОПАДАНИЕ НА ЦЕЛЬ — клетка ${r.toPosition} «Космическое сознание». Заверши игру: дай трактовку завершения относительно намерения, без пафоса и без присвоения достижения.`;
    case 'normal':
    default:
      return `СОБЫТИЕ: обычный ход на клетку ${r.toPosition}.`;
  }
}

/**
 * Возвращает текст для role:'user' — факты хода + задание дать трактовку
 * строго по структуре из системного промта.
 */
export function buildTurnContext(state: GameState, move: Move): string {
  const r = move.result;
  const lines: string[] = [];

  lines.push(`НАМЕРЕНИЕ ИГРОКА: "${state.intention}"`);
  lines.push(`ИСТОРИЯ ХОДОВ: ${formatHistory(state.history)}`);

  if (r.fromPosition > 0) {
    const prev = getCell(r.fromPosition);
    lines.push(`ПРЕДЫДУЩАЯ КЛЕТКА: ${prev.number} «${prev.name}»`);
  } else {
    lines.push('ПРЕДЫДУЩАЯ КЛЕТКА: игрок был вне доски');
  }

  lines.push('');
  lines.push(describeEvent(r));

  // Данные клетки для трактовки (если игрок на доске).
  if (r.cellNumber != null && r.event !== 'awaiting_entry') {
    const cell = getCell(r.cellNumber);
    lines.push('');
    lines.push(`ТЕКУЩАЯ КЛЕТКА: ${cell.number} «${cell.name}»${cell.sanskrit ? ` (${cell.sanskrit})` : ''}`);
    lines.push(`  символический смысл (опора): ${cell.meaning}`);
    lines.push(`  теневая сторона (опора): ${cell.shadow}`);
  }

  lines.push('');
  lines.push(
    r.event === 'awaiting_entry'
      ? 'Задача: кратко (2–3 предложения) отметь состояние ожидания входа относительно намерения. Не трактуй клетку и не сообщай число.'
      : 'Задача: дай трактовку этой клетки строго по структуре из системного промта (1. Название клетки … 7. Вопрос), относительно намерения игрока. Опирайся на переданные смысл и теневую сторону, раскрывая их живо и по канону «Лилы». Не сообщай число кубика и номер позиции — это уже показано игроку.',
  );

  return lines.join('\n');
}
