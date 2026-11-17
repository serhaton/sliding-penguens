/**
 * Hamle geçmişi: geri alma ve maç kaydı için.
 *
 * Durumlar değişmez olduğu için geri almak yalnızca bir önceki duruma dönmektir;
 * "tersine hamle" hesabı yok, dolayısıyla çatlak buz ve uyanan penguen gibi
 * mekanikler de kendiliğinden doğru geri alınır.
 *
 * Kaç geri alma hakkı kaldığı (3 ücretsiz, sonrası coin) motorun değil,
 * bölüm ekranının ve ekonominin konusudur.
 */
import { applyMove } from './applyMove';
import type { GameEvent, GameState, Move } from './types';

export interface History {
  /** states[0] başlangıç; states[i] = i hamle sonraki durum. */
  readonly states: readonly GameState[];
  /** Uygulanmış hamleler. moves.length === states.length - 1. */
  readonly moves: readonly Move[];
}

export function createHistory(initial: GameState): History {
  return { states: [initial], moves: [] };
}

export function currentState(history: History): GameState {
  return history.states[history.states.length - 1]!;
}

export function canUndo(history: History): boolean {
  return history.moves.length > 0;
}

/** Hamleyi oynar. Reddedilirse geçmiş değişmez (aynı nesne döner). */
export function playMove(
  history: History,
  move: Move,
): { history: History; events: readonly GameEvent[]; accepted: boolean } {
  const outcome = applyMove(currentState(history), move);
  if (!outcome.accepted) return { history, events: outcome.events, accepted: false };
  return {
    history: {
      states: [...history.states, outcome.state],
      moves: [...history.moves, move],
    },
    events: outcome.events,
    accepted: true,
  };
}

/** Son hamleyi geri alır. Geri alınacak hamle yoksa geçmiş değişmez. */
export function undo(history: History): History {
  if (!canUndo(history)) return history;
  return {
    states: history.states.slice(0, -1),
    moves: history.moves.slice(0, -1),
  };
}

/** Baştan başla: yalnızca başlangıç durumu kalır. */
export function restart(history: History): History {
  return createHistory(history.states[0]!);
}
