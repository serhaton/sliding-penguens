/**
 * Düello bilgisayar rakibi. Üç zorluk:
 *
 *  - easy   İlerleme sağlayan hamlelerden rastgele biri; ara sıra bilerek "hata"
 *           (tamamen rastgele hamle). Yeni oyuncu kazanabilmeli.
 *  - medium Tek hamle ileriye bakan açgözlü seçim: hamleden hemen sonraki durumu
 *           en iyi yapan hamle. Rakibin cevabını düşünmez.
 *  - hard   Alfa-beta minimax (4 yarım hamle): rakibin en iyi cevaplarını da hesaba
 *           katar, bloklar ve bloklanmaktan kaçınır.
 *
 * Yapay zekâ motorun aynısını kullanır (`applyMove`), kendi kuralı yoktur.
 * Rastgelelik dışarıdan verilir: aynı tohum aynı maçı üretir (test ve simülasyon).
 */
import { applyMove, legalMoves, type GameState, type Move } from '@/engine';
import type { Rng } from '@/generator/rng';

import { teamDistance } from './evaluate';
import { scoreMoves, type ScoredMove } from './search';

export * from './evaluate';
export * from './search';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const AI_SETTINGS = {
  /** Kolay: bu olasılıkla tamamen rastgele bir hamle yapar ("hata"). */
  easyMistakeRate: 0.3,
  /** Zor: aramanın derinliği (yarım hamle). */
  hardDepth: 4,
  /** Eşit sayılan hamleler arasındaki en büyük puan farkı. */
  tieEpsilon: 1e-6,
} as const;

/** En yüksek puanlı hamleler (eşit sayılanların hepsi). */
function topMoves(scored: readonly ScoredMove[]): ScoredMove[] {
  const best = Math.max(...scored.map((s) => s.value));
  return scored.filter((s) => s.value >= best - AI_SETTINGS.tieEpsilon);
}

/** En iyi puanlı hamlelerden rastgele biri (eşitlikte hep aynı hamleyi oynamasın). */
function pickBest(scored: readonly ScoredMove[], rng: Rng): Move {
  return rng.pick(topMoves(scored)).move;
}

/**
 * Zor: derin aramada eşit çıkan hamleler arasında, hemen şimdi en çok işe
 * yarayanı seçer. Yoksa "nasılsa birkaç hamle sonra da girerim" diye yuvanın
 * önünde oyalanır; iyi oyuncu fırsatı ertelemez.
 */
function hardMove(state: GameState, rng: Rng): Move {
  const deep = topMoves(scoreMoves(state, AI_SETTINGS.hardDepth));
  if (deep.length === 1) return deep[0]!.move;
  const candidates = new Set(deep.map((s) => s.move.penguinId));
  return pickBest(
    scoreMoves(state, 1).filter((s) => candidates.has(s.move.penguinId)),
    rng,
  );
}

function easyMove(state: GameState, moves: readonly Move[], rng: Rng): Move {
  if (rng.next() < AI_SETTINGS.easyMistakeRate) return rng.pick(moves);
  // İlerleme: hamleden sonra takımın yuvaya toplam uzaklığı azalıyor mu?
  const team = state.turn;
  const before = teamDistance(state, team);
  const progress = moves.filter((move) => teamDistance(applyMove(state, move).state, team) < before);
  return rng.pick(progress.length > 0 ? progress : moves);
}

/**
 * Sıradaki takım için hamle seçer. Geçerli hamle yoksa (oyun bitmişse) null.
 * Motor hamlesi olmayan takımı otomatik pas geçirdiği için, oyun sürerken
 * sıradaki takımın her zaman en az bir hamlesi vardır.
 */
export function chooseMove(state: GameState, difficulty: Difficulty, rng: Rng): Move | null {
  const moves = legalMoves(state);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0]!;

  switch (difficulty) {
    case 'easy':
      return easyMove(state, moves, rng);
    case 'medium':
      return pickBest(scoreMoves(state, 1), rng);
    case 'hard':
      return hardMove(state, rng);
  }
}
