/**
 * Bölüm kataloğu. Ekranlar bölümlere yalnızca buradan ulaşır.
 *
 * Antarktika üç maceradan oluşur; her macera 30 bölüm ve üç bölgedir. Zorluk
 * kuralların kendisinden gelir:
 *
 *   Macera 1 — Buz Kıyısı
 *     1–10   A  sabit yön (kimi önce çekeceğim)
 *     11–20  B  çarpınca dön (park et, çarptır)
 *     21–30  C  dalgalar (aynı tahtada art arda gelen gruplar; uzun bölümler)
 *   Macera 2 — Çatlak Buz (üstünden bir kez geçilir, sonra suya döner)
 *     31–40  A  iki penguen      41–50  B  park + üç penguen      51–60  C  dalgalar
 *   Macera 3 — Uyuyan Penguen (çarpılınca uyanır; uyurken engeldir)
 *     61–70  A  bir uykucu       71–80  B  çatlakla, iki uykucu    81–90  C  dalgalar
 *
 * Her mekaniğin ilk bölümleri elle yazılmış öğreticidir (handmade.ts), gerisi
 * üreticiden gelir (world*.json; `npm run levels:generate`).
 * Bölüm numaraları burada, sıraya göre verilir.
 */
import type { LevelDef, PenguinColor } from '@/engine';
import type { TranslationKey } from '@/i18n';

import { handmade2A, handmade3A, handmadeA, handmadeB } from './handmade';
import w1a from './world1-a.json';
import w1b from './world1-b.json';
import w1c from './world1-c.json';
import w2a from './world2-a.json';
import w2b from './world2-b.json';
import w2c from './world2-c.json';
import w3a from './world3-a.json';
import w3b from './world3-b.json';
import w3c from './world3-c.json';

/** Bir maceranın bölgesi: adı, haritadaki rengi ve bölümleri. */
export interface LevelSection {
  /** Macera numarası (bölüm verisindeki `world`). */
  episode: number;
  key: 'A' | 'B' | 'C';
  /** Haritada bölgenin ilk düğümünün üstünde yazan ad. */
  titleKey: TranslationKey;
  /** Haritada bu bölgenin düğüm rengi. */
  color: PenguinColor;
  /** Bu bölgenin ilk seviyesinden önce tanıtılacak mekanik. */
  intro?: string;
  levels: LevelDef[];
}

const generated = (data: unknown) => data as LevelDef[];

const sections: LevelSection[] = [
  { episode: 1, key: 'A', titleKey: 'map.sectionA', color: 'blue', levels: [...handmadeA, ...generated(w1a)] },
  { episode: 1, key: 'B', titleKey: 'map.sectionB', color: 'purple', intro: 'turn', levels: [...handmadeB, ...generated(w1b)] },
  { episode: 1, key: 'C', titleKey: 'map.sectionC', color: 'green', intro: 'waves', levels: generated(w1c) },
  { episode: 2, key: 'A', titleKey: 'map.section2A', color: 'orange', intro: 'cracked', levels: [...handmade2A, ...generated(w2a)] },
  { episode: 2, key: 'B', titleKey: 'map.section2B', color: 'yellow', levels: generated(w2b) },
  { episode: 2, key: 'C', titleKey: 'map.section2C', color: 'blue', levels: generated(w2c) },
  { episode: 3, key: 'A', titleKey: 'map.section3A', color: 'red', intro: 'sleep', levels: [...handmade3A, ...generated(w3a)] },
  { episode: 3, key: 'B', titleKey: 'map.section3B', color: 'purple', levels: generated(w3b) },
  { episode: 3, key: 'C', titleKey: 'map.section3C', color: 'green', levels: generated(w3c) },
];

/** Sıra numarası verilmiş, tanıtımı işaretlenmiş bölgeler. */
export const levelSections: readonly (LevelSection & { first: number })[] = (() => {
  let next = 1;
  return sections.map((section) => {
    const first = next;
    const levels = section.levels.map((level, i) => ({
      ...level,
      id: String(first + i),
      world: section.episode,
      ...(i === 0 && section.intro ? { intro: section.intro } : {}),
    }));
    next += levels.length;
    return { ...section, levels, first };
  });
})();

export const levels: readonly LevelDef[] = levelSections.flatMap((section) => section.levels);

/**
 * Tasarım kuralı: ilk bu kadar bölümde çıkmaz yok (Macera 1'in A ve B bölgeleri). Oyuncu hangi sırayla
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
