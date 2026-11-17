/**
 * Oyuncunun bölümlerdeki ilerlemesi.
 *
 * Ayrı bir kayıt tutulmaz: ilerleme, cüzdandaki yıldız tablosundan türetilir
 * (bölüm kimliği → en yüksek yıldız). O tablo iCloud'la eşitlendiği için
 * ilerleme de cihazlar arasında kendiliğinden taşınır ve coinlerle asla
 * çelişmez.
 *
 * Buradaki fonksiyonlar saftır (test edilebilir); ekranlar `useProgress()`
 * kancasını kullanır.
 */
import { levels as allLevels } from '@/data/levels';
import { useWallet } from '@/economy/wallet';
import type { LevelDef } from '@/engine';

export type StarTable = Readonly<Record<string, number>>;

/** Haritadaki bir düğümün durumu. */
export type NodeStatus = 'done' | 'current' | 'locked';

export interface Progress {
  /** Sıradaki oynanacak bölüm (hepsi bittiyse sonuncusu). */
  currentId: string;
  /** Sıradaki bölümün numarası (1'den başlar). */
  currentNumber: number;
  /** Hiç bölüm bitirilmemiş: ilk açılış. */
  fresh: boolean;
  /** Bütün bölümler bitti. */
  allDone: boolean;
  totalStars: number;
  maxStars: number;
  starsOf: (levelId: string) => number;
  statusOf: (levelId: string) => NodeStatus;
}

export function computeProgress(stars: StarTable, levels: readonly LevelDef[] = allLevels): Progress {
  const starsOf = (id: string) => Math.min(3, Math.max(0, Math.floor(stars[id] ?? 0)));
  // İlk bitirilmemiş bölüm. Sıra atlanamaz: önceki bitmeden sonraki açılmaz.
  const firstOpen = levels.findIndex((level) => starsOf(level.id) === 0);
  const allDone = firstOpen === -1;
  const currentIndex = allDone ? levels.length - 1 : firstOpen;
  const currentId = levels[currentIndex]?.id ?? '';

  return {
    currentId,
    currentNumber: currentIndex + 1,
    fresh: firstOpen === 0,
    allDone,
    totalStars: levels.reduce((sum, level) => sum + starsOf(level.id), 0),
    maxStars: levels.length * 3,
    starsOf,
    statusOf: (id) => {
      const index = levels.findIndex((level) => level.id === id);
      if (index < 0 || index > currentIndex) return 'locked';
      if (index === currentIndex && !allDone) return 'current';
      return 'done';
    },
  };
}

/** İlerleme; yıldızlar değişince (bu cihazda ya da iCloud'dan) yeniden hesaplanır. */
export function useProgress(): Progress {
  const { state } = useWallet();
  return computeProgress(state.stars);
}
