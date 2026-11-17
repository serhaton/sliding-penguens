/**
 * Tek oyunculu bölümler için en kısa çözümü bulan çözücü (BFS).
 *
 * Oyunun kendi motorunu kullanır (`applyMove`, `legalMoves`), bu yüzden kurallar
 * tek yerde durur: motorda bir mekanik değişirse çözücü kendiliğinden uyar.
 *
 * Genişlik öncelikli arama, hamle sayısına göre katman katman ilerlediği için
 * bulduğu ilk çözüm en kısa olandır → par. Durumlar `stateKey` ile tekilleştirilir
 * (penguen konumları + uyuyanlar + kırılan hücreler + igloo dolulukları).
 */
import { applyMove, legalMoves, stateKey, type GameState } from '@/engine';

export type SolveResult =
  /** `moves`: sırayla dokunulacak penguen kimlikleri. `par` = moves.length. */
  | { status: 'solved'; moves: string[]; par: number; explored: number }
  /** Bütün durumlar gezildi, çözüm yok. */
  | { status: 'unsolvable'; explored: number }
  /** Durum sınırı aşıldı; çözüm olabilir de olmayabilir de. */
  | { status: 'limit'; explored: number };

export interface SolveOptions {
  /**
   * En fazla kaç farklı durum gezilsin. Cihazdaki canlı ipucu için küçük,
   * bölüm üreticide büyük tutulur.
   */
  maxStates?: number;
}

export const DEFAULT_MAX_STATES = 200_000;

interface Node {
  state: GameState;
  /** Bu duruma hangi düğümden, hangi penguenle gelindi (kök için -1 / ''). */
  parent: number;
  penguinId: string;
}

export function solve(start: GameState, options: SolveOptions = {}): SolveResult {
  if (start.teams.length !== 1) {
    throw new Error('Çözücü yalnızca tek oyunculu (tek takımlı) durumlar içindir');
  }
  const maxStates = options.maxStates ?? DEFAULT_MAX_STATES;

  if (start.result) {
    // Zaten bitmiş: kazanılmışsa sıfır hamlelik çözüm.
    return start.result.winner !== null
      ? { status: 'solved', moves: [], par: 0, explored: 1 }
      : { status: 'unsolvable', explored: 1 };
  }

  // Dizi + baş indeksi: shift() kullanmadan O(1) kuyruk. Düğümler yerinde
  // kaldığı için çözüm yolu ebeveyn indekslerinden geri izlenir.
  const nodes: Node[] = [{ state: start, parent: -1, penguinId: '' }];
  const seen = new Set<string>([stateKey(start)]);

  for (let head = 0; head < nodes.length; head++) {
    const node = nodes[head]!;
    for (const move of legalMoves(node.state)) {
      const next = applyMove(node.state, move).state;

      if (next.result) {
        const moves = [move.penguinId];
        for (let i = head; nodes[i]!.parent !== -1; i = nodes[i]!.parent) {
          moves.push(nodes[i]!.penguinId);
        }
        moves.reverse();
        return { status: 'solved', moves, par: moves.length, explored: seen.size };
      }

      const key = stateKey(next);
      if (seen.has(key)) continue;
      if (seen.size >= maxStates) return { status: 'limit', explored: seen.size };
      seen.add(key);
      nodes.push({ state: next, parent: head, penguinId: move.penguinId });
    }
  }

  return { status: 'unsolvable', explored: seen.size };
}
