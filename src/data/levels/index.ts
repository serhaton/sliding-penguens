/**
 * Bölüm kataloğu. Ekranlar bölümlere yalnızca buradan ulaşır.
 *
 * Dünya 1 üç bölümden oluşur; zorluk kuralların kendisinden gelir:
 *   1–10   A  sabit yön (kimi önce çekeceğim)
 *   11–20  B  çarpınca dön (park et, çarptır)
 *   21–30  C  dalgalar (aynı tahtada art arda gelen gruplar; uzun bölümler)
 *
 * Her bölümün ilk bölümleri elle yazılmış öğreticidir (handmade.ts), gerisi
 * üreticiden gelir (world1-*.json; `npm run levels:generate`).
 * Bölüm numaraları burada, sıraya göre verilir.
 */
import type { LevelDef } from '@/engine';

import { handmadeA, handmadeB } from './handmade';
import generatedA from './world1-a.json';
import generatedB from './world1-b.json';
import generatedC from './world1-c.json';

/** Bir dünyanın bölümü: adı (rapor ve geliştirici ekranı için) ve bölümleri. */
export interface LevelSection {
  key: 'A' | 'B' | 'C';
  /** Bu bölümün ilk seviyesinden önce tanıtılacak mekanik. */
  intro?: string;
  levels: LevelDef[];
}

const sections: LevelSection[] = [
  { key: 'A', levels: [...handmadeA, ...(generatedA as LevelDef[])] },
  { key: 'B', intro: 'turn', levels: [...handmadeB, ...(generatedB as LevelDef[])] },
  { key: 'C', intro: 'waves', levels: generatedC as LevelDef[] },
];

/** Sıra numarası verilmiş, tanıtımı işaretlenmiş bölümler. */
export const levelSections: readonly (LevelSection & { first: number })[] = (() => {
  let next = 1;
  return sections.map((section) => {
    const first = next;
    const levels = section.levels.map((level, i) => ({
      ...level,
      id: String(first + i),
      world: 1,
      ...(i === 0 && section.intro ? { intro: section.intro } : {}),
    }));
    next += levels.length;
    return { ...section, levels, first };
  });
})();

export const levels: readonly LevelDef[] = levelSections.flatMap((section) => section.levels);

/**
 * Tasarım kuralı: ilk bu kadar bölümde çıkmaz yok. Oyuncu hangi sırayla
 * dokunursa dokunsun bölüm bitirilebilir kalır; yanlış sıra yalnızca hamle
 * (yıldız) kaybettirir. Kilitlenme tuzakları ancak bundan sonra, ölçülü gelir
 * ve oyun çıkmazı fark edip "geri al" der. Testler bu sayıyı kullanır.
 */
export const FORGIVING_LEVELS = 19;

export function getLevel(id: string): LevelDef | undefined {
  return levels.find((level) => level.id === id);
}

/** Bölümün sıra numarası (1'den başlar); bulunamazsa 0. */
export function levelNumber(id: string): number {
  return levels.findIndex((level) => level.id === id) + 1;
}

/** Sıradaki bölüm; sonuncuysa undefined. */
export function nextLevel(id: string): LevelDef | undefined {
  const index = levels.findIndex((level) => level.id === id);
  return index >= 0 ? levels[index + 1] : undefined;
}
