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

/** Tahta dosyalarındaki varsayılan takım renkleri: takım 0 mavi, takım 1 turuncu. */
export const duelTeamColors: readonly PenguinColor[] = ['blue', 'orange'];

/** Bir düellonun iki takım rengi: [takım 0 (cihaz sahibi), takım 1 (rakip)]. */
export type DuelColors = readonly [PenguinColor, PenguinColor];

const ALL_COLORS: readonly PenguinColor[] = ['blue', 'orange', 'red', 'yellow', 'green', 'purple'];

export function isPenguinColor(value: unknown): value is PenguinColor {
  return ALL_COLORS.includes(value as PenguinColor);
}

/** Rakibin rengi: oyuncununkinden farklı, rastgele bir renk. */
export function randomRivalColor(mine: PenguinColor, random: () => number = Math.random): PenguinColor {
  const others = ALL_COLORS.filter((color) => color !== mine);
  return others[Math.min(others.length - 1, Math.floor(random() * others.length))]!;
}

/**
 * Tahtayı verilen takım renklerine boyar: penguenler ve iglolar takımlarının
 * rengini alır. Tahtanın düzeni ve kuralları değişmez (düelloda eşleşme takıma
 * göredir, renge göre değil).
 */
export function recolorDuelBoard(board: LevelDef, colors: DuelColors): LevelDef {
  return {
    ...board,
    penguins: board.penguins.map((p) => ({ ...p, color: colors[p.team ?? 0] ?? p.color })),
    igloos: board.igloos.map((g) => ({ ...g, color: colors[g.team ?? 0] ?? g.color })),
  };
}
