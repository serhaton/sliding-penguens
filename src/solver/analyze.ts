/**
 * Bölüm analizi: bir bölümde ulaşılabilen bütün durumları gezer ve oyuncunun
 * kendini çıkmaza sokup sokamayacağını ölçer.
 *
 * Çıkmaz = bölüm henüz bitmemiş ama oradan hiçbir hamle dizisi bitirmiyor
 * (ör. penguenlerin birbirini kilitlemesi). Kaybetmek olmasa da çıkmaz, oyuncuyu
 * geri almaya zorlar; erken bölümlerde hiç olmamalı, sonrakilerde ölçülü olmalı.
 * Bölüm üretici zorluk ölçütü olarak, testler de kural olarak bunu kullanır.
 */
import { applyMove, legalMoves, stateKey, type GameState } from '@/engine';

import { DEFAULT_MAX_STATES } from './solve';

export interface LevelAnalysis {
  /** Ulaşılabilen farklı durum sayısı (başlangıç dahil). */
  states: number;
  /** Bunlardan kaçı çıkmaz. */
  deadEnds: number;
  /** İlk hamlelerden kaçı doğrudan çıkmaza götürüyor. */
  losingFirstMoves: number;
  /** Başlangıçta oynanabilen penguen sayısı. */
  openingMoves: number;
  /** Durum sınırı aşıldı: sayılar eksik olabilir. */
  truncated: boolean;
}

export function analyzeLevel(start: GameState, maxStates = DEFAULT_MAX_STATES): LevelAnalysis {
  if (start.teams.length !== 1) throw new Error('Analiz yalnızca tek oyunculu durumlar içindir');

  // 1) İleri doğru gez: durumlar ve aralarındaki geçişler.
  const index = new Map<string, number>([[stateKey(start), 0]]);
  const states: GameState[] = [start];
  const parents: number[][] = [[]];
  const firstMoveTargets: number[] = [];
  let truncated = false;

  for (let i = 0; i < states.length; i++) {
    const state = states[i]!;
    if (state.result) continue;
    for (const move of legalMoves(state)) {
      const next = applyMove(state, move).state;
      const key = stateKey(next);
      let j = index.get(key);
      if (j === undefined) {
        if (states.length >= maxStates) {
          truncated = true;
          continue;
        }
        j = states.length;
        index.set(key, j);
        states.push(next);
        parents.push([]);
      }
      parents[j]!.push(i);
      if (i === 0) firstMoveTargets.push(j);
    }
  }

  // 2) Geriye doğru yay: bitmiş durumlardan ulaşılabilenler "kazanılabilir".
  const winnable = new Array<boolean>(states.length).fill(false);
  const queue: number[] = [];
  states.forEach((state, i) => {
    if (state.result) {
      winnable[i] = true;
      queue.push(i);
    }
  });
  for (let head = 0; head < queue.length; head++) {
    for (const parent of parents[queue[head]!]!) {
      if (!winnable[parent]) {
        winnable[parent] = true;
        queue.push(parent);
      }
    }
  }

  return {
    states: states.length,
    deadEnds: winnable.filter((w) => !w).length,
    losingFirstMoves: firstMoveTargets.filter((j) => !winnable[j]).length,
    openingMoves: firstMoveTargets.length,
    truncated,
  };
}
