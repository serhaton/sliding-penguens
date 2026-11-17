/**
 * Düello tahtaları. Hepsi 180° döndürmeye göre simetriktir ve bilgisayar-
 * bilgisayara maçlarla ölçülüp seçilmiştir (`npm run duel:generate`).
 * Ekranlar tahtalara yalnızca buradan ulaşır.
 */
import type { LevelDef, PenguinColor } from '@/engine';

import boards from './boards.json';

export const duelBoards: readonly LevelDef[] = boards as LevelDef[];

export function getDuelBoard(id: string): LevelDef | undefined {
  return duelBoards.find((board) => board.id === id);
}

/**
 * Sıra numarasına göre tahta; sona gelince baştan döner. Rövanşlarda ve art
 * arda maçlarda farklı tahtalar gelsin diye kullanılır.
 */
export function duelBoardAt(index: number): LevelDef {
  const count = duelBoards.length;
  return duelBoards[((index % count) + count) % count]!;
}

/** Takım renkleri: takım 0 (alttaki oyuncu) mavi, takım 1 (üstteki) turuncu. */
export const duelTeamColors: readonly PenguinColor[] = ['blue', 'orange'];
