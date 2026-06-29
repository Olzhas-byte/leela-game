/**
 * Детерминированные правила «Лилы». Чистые функции без побочных эффектов —
 * именно здесь живёт вся арифметика игры. LLM сюда не вмешивается.
 */
import { GAME_CONFIG } from './config';
import { getTransitionFrom, type Transition } from './board';

export type RollSource = 'player' | 'auto';

/** Тип события хода — определяется кодом, передаётся в UI и в контекст для LLM. */
export type MoveEventType =
  | 'awaiting_entry' // выпало не 6 до входа в игру — игрок остаётся вне доски
  | 'entry'          // вход в игру (рождение) по выпавшей 6
  | 'normal'         // обычный ход
  | 'arrow'          // попадание на стрелу (подъём)
  | 'snake'          // попадание на змею (падение)
  | 'overshoot'      // перелёт за край доски — ход не вмещается, остаёмся
  | 'win';           // точное попадание на клетку-цель

export interface MoveResult {
  event: MoveEventType;
  fromPosition: number;
  /** Куда встал кубик ДО применения змеи/стрелы. */
  landedPosition: number;
  /** Итоговая позиция ПОСЛЕ применения перехода. */
  toPosition: number;
  /** Номер клетки, которую нужно трактовать (= toPosition, если игрок на доске). */
  cellNumber: number | null;
  transition: Transition | null;
  /** Игрок получает дополнительный ход (выпала 6 и партия не завершена). */
  extraTurn: boolean;
  finished: boolean;
}

/** Криптослучайный бросок 1..DICE_MAX (для server-side auto-режима). */
export function rollDice(): number {
  const { DICE_MIN, DICE_MAX } = GAME_CONFIG;
  const range = DICE_MAX - DICE_MIN + 1;
  // crypto доступен и в Node 18+, и в браузере
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return DICE_MIN + (buf[0] % range);
}

export function isValidDice(n: number): boolean {
  return Number.isInteger(n) && n >= GAME_CONFIG.DICE_MIN && n <= GAME_CONFIG.DICE_MAX;
}

/**
 * Главная функция хода. Принимает текущую позицию (0 = вне доски) и выпавшее
 * число, возвращает полностью вычисленный результат. Никаких имён/трактовок —
 * только числа и тип события.
 */
export function applyRoll(currentPosition: number, dice: number): MoveResult {
  const cfg = GAME_CONFIG;
  const isSix = dice === cfg.DICE_MAX;

  // ── 1. Игрок ещё вне доски (позиция 0): нужен вход ──────────────────────────
  if (currentPosition === 0 && cfg.ENTRY_REQUIRES_SIX) {
    if (!isSix) {
      return {
        event: 'awaiting_entry',
        fromPosition: 0,
        landedPosition: 0,
        toPosition: 0,
        cellNumber: null,
        transition: null,
        extraTurn: false, // не вошёл — ход переходит дальше
        finished: false,
      };
    }
    // Вход в игру — «рождение» на стартовой клетке.
    const entry = cfg.ENTRY_SQUARE;
    return {
      event: 'entry',
      fromPosition: 0,
      landedPosition: entry,
      toPosition: entry,
      cellNumber: entry,
      transition: null,
      extraTurn: cfg.EXTRA_TURN_ON_SIX, // 6 всегда даёт ещё ход
      finished: false,
    };
  }

  // ── 2. Обычное перемещение ─────────────────────────────────────────────────
  let landed = currentPosition + dice;

  // Перелёт за край доски.
  if (landed > cfg.BOARD_MAX) {
    if (cfg.OVERSHOOT_BEHAVIOR === 'stay') {
      return {
        event: 'overshoot',
        fromPosition: currentPosition,
        landedPosition: currentPosition,
        toPosition: currentPosition,
        cellNumber: currentPosition,
        transition: null,
        extraTurn: isSix && cfg.EXTRA_TURN_ON_SIX,
        finished: false,
      };
    }
    // bounce: отражение от края
    landed = cfg.BOARD_MAX - (landed - cfg.BOARD_MAX);
  }

  // ── 3. Победа: точное попадание на клетку-цель ─────────────────────────────
  if (landed === cfg.WIN_SQUARE) {
    return {
      event: 'win',
      fromPosition: currentPosition,
      landedPosition: landed,
      toPosition: landed,
      cellNumber: landed,
      transition: null,
      extraTurn: false,
      finished: true,
    };
  }

  // ── 4. Проверка змей и стрел ───────────────────────────────────────────────
  const transition = getTransitionFrom(landed) ?? null;
  if (transition) {
    return {
      event: transition.type, // 'arrow' | 'snake'
      fromPosition: currentPosition,
      landedPosition: landed,
      toPosition: transition.to,
      cellNumber: transition.to,
      transition,
      extraTurn: isSix && cfg.EXTRA_TURN_ON_SIX,
      finished: false,
    };
  }

  // ── 5. Обычный ход без перехода ────────────────────────────────────────────
  return {
    event: 'normal',
    fromPosition: currentPosition,
    landedPosition: landed,
    toPosition: landed,
    cellNumber: landed,
    transition: null,
    extraTurn: isSix && cfg.EXTRA_TURN_ON_SIX,
    finished: false,
  };
}
