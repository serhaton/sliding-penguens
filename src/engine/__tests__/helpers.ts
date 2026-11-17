import { applyMove } from '../applyMove';
import { createGame, type IglooDef, type LevelDef, type PenguinDef } from '../level';
import type { GameEvent, GameState } from '../types';

/** Testlerde kısa bölüm tanımı. */
export function level(
  grid: string[],
  penguins: PenguinDef[],
  igloos: IglooDef[],
  extra: Partial<LevelDef> = {},
): LevelDef {
  return { id: 'test', grid, penguins, igloos, ...extra };
}

export function game(...args: Parameters<typeof level>): GameState {
  return createGame(level(...args));
}

/** Girdinin değişmediğini kanıtlamak için: dondurulmuş nesneye yazmak hata fırlatır. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/** Hamleleri sırayla oynar; biri reddedilirse test patlar. */
export function play(state: GameState, ...penguinIds: string[]): GameState {
  for (const penguinId of penguinIds) {
    const outcome = applyMove(state, { penguinId });
    if (!outcome.accepted) {
      throw new Error(`'${penguinId}' hamlesi reddedildi: ${JSON.stringify(outcome.events)}`);
    }
    state = outcome.state;
  }
  return state;
}

export function penguin(state: GameState, id: string) {
  const found = state.penguins.find((p) => p.id === id);
  if (!found) throw new Error(`penguen yok: ${id}`);
  return found;
}

export function types(events: readonly GameEvent[]): string[] {
  return events.map((e) => e.type);
}
