/**
 * İpucu: mevcut durumdan çözümün bir sonraki hamlesi.
 *
 * Hızlı yol: bölüm verisinde önceden hesaplanmış çözüm durur. Oyuncu o yolun
 * üstündeyse sıradaki hamle doğrudan oradan okunur (arama yok).
 * Yavaş yol: oyuncu çözümden saptıysa çözücü mevcut durumdan canlı çalışır.
 */
import { computeSlide, type Direction, type GameState, type Move } from '@/engine';

import { solve, type SolveOptions } from './solve';

export type Hint =
  /** Bu penguene dokun. Arayüz pengueni parlatır ve `dir` yönünde ok gösterir. */
  | {
      kind: 'move';
      penguinId: string;
      dir: Direction;
      /** Bu hamle dahil, bitirmek için gereken en az hamle. */
      movesLeft: number;
      /** cached: hazır çözümden; live: çözücü şimdi hesapladı. */
      source: 'cached' | 'live';
    }
  /** Buradan çözüm yok: oyuncu geri almalı ya da baştan başlamalı. */
  | { kind: 'deadEnd' }
  /** Bölüm zaten bitmiş. */
  | { kind: 'finished' }
  /** Çözücü sınırı aştı; cevap bilinmiyor (pratikte küçük tahtalarda olmaz). */
  | { kind: 'unknown' };

export interface HintInput {
  /** Şu anki durum. */
  state: GameState;
  /** Bölümün hazır çözümü (penguen kimlikleri), varsa. */
  solution?: readonly string[];
  /** Bölümün başından beri oynanan hamleler (geri alınanlar hariç). */
  played?: readonly Move[];
}

/** Cihazda canlı arama için sınır: 6×8 tahtada fazlasıyla yeterli, yine de çabuk biter. */
export const HINT_MAX_STATES = 60_000;

export function getHint(input: HintInput, options: SolveOptions = {}): Hint {
  const { state, solution, played = [] } = input;
  if (state.result) return { kind: 'finished' };

  const moveHint = (penguinId: string, movesLeft: number, source: 'cached' | 'live'): Hint | null => {
    const penguin = state.penguins.find((p) => p.id === penguinId);
    // Hazır çözüm bayatsa (bölüm verisi değişmiş olabilir) güvenme: canlı aramaya düş.
    if (!penguin || penguin.status !== 'active' || computeSlide(state, penguin).path.length === 0) {
      return null;
    }
    return { kind: 'move', penguinId, dir: penguin.dir, movesLeft, source };
  };

  // Hızlı yol: oynananlar, hazır çözümün başıyla birebir aynı mı?
  if (solution && played.length < solution.length) {
    const onPath = played.every((move, i) => move.penguinId === solution[i]);
    if (onPath) {
      const hint = moveHint(solution[played.length]!, solution.length - played.length, 'cached');
      if (hint) return hint;
    }
  }

  // Yavaş yol: mevcut durumdan çöz.
  const result = solve(state, { maxStates: HINT_MAX_STATES, ...options });
  if (result.status === 'unsolvable') return { kind: 'deadEnd' };
  if (result.status === 'limit') return { kind: 'unknown' };
  return moveHint(result.moves[0]!, result.par, 'live') ?? { kind: 'unknown' };
}
