/**
 * Alfa-beta budamalı minimax. Sıra motorun kurallarından okunur (`state.turn`):
 * pas ve "ikinci oyuncuya ekstra hamle" kuralı kendiliğinden doğru işler.
 */
import { applyMove, legalMoves, type GameState, type Move, type TeamId } from '@/engine';

import { evaluate, WIN } from './evaluate';

export interface ScoredMove {
  move: Move;
  /** Hamlenin, arama derinliği sonundaki değeri (`team` açısından). */
  value: number;
}

/**
 * Durumun `team` açısından değeri. `depth`: kalan yarım hamle (ply) sayısı.
 * `ply`: kökten uzaklık; erken galibiyet daha değerli, geç yenilgi daha az kötü olsun diye.
 */
function search(state: GameState, team: TeamId, depth: number, ply: number, alpha: number, beta: number): number {
  if (state.result) {
    const value = evaluate(state, team);
    // Galibiyet/yenilgi puanı uzaklaştıkça küçülür: yapay zekâ en kısa yoldan
    // kazanmaya, kaybedecekse en uzun süre direnmeye çalışır.
    return value > 0 ? value - ply : value < 0 ? value + ply : 0;
  }
  if (depth === 0) return evaluate(state, team);

  const moves = legalMoves(state);
  const maximizing = state.turn === team;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const next = applyMove(state, move).state;
    const value = search(next, team, depth - 1, ply + 1, alpha, beta);
    if (maximizing) {
      if (value > best) best = value;
      if (best > alpha) alpha = best;
    } else {
      if (value < best) best = value;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Sıradaki takımın her hamlesini `depth` yarım hamle ileriye bakarak puanlar.
 * Kökte budama yapılmaz: her hamlenin gerçek değeri gerekir (eşit hamleler
 * arasında rastgele seçim ve zorluk ayarı için).
 */
export function scoreMoves(state: GameState, depth: number): ScoredMove[] {
  const team = state.turn;
  return legalMoves(state).map((move) => ({
    move,
    value: search(applyMove(state, move).state, team, Math.max(0, depth - 1), 1, -Infinity, Infinity),
  }));
}

/** Kesin galibiyet puanı mı? (Arayüz ve testler için.) */
export function isWinningValue(value: number): boolean {
  return value > WIN / 2;
}
