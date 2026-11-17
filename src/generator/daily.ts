/**
 * Günlük bulmaca havuzu. Macera bölümlerinden ayrı, orta zorlukta kısa
 * bulmacalar: üç mekanik sırayla döner (çarpınca dön, çatlak buz, uyuyan
 * penguen), böylece art arda günler birbirine benzemez.
 *
 * Havuz 42 bulmacadır (altı hafta); bittiğinde baştan döner.
 * Üretim: npm run levels:generate -- --part daily --write
 */
import type { GenParams } from './generate';
import type { Slot } from './select';

const TURN = { turnOnBump: true } as const;
const base = { water: 0, freeIgloos: true, rules: TURN } as const;

const TURN_GEN: GenParams = { ...base, width: 5, height: 6, penguins: 2, rocks: 2 };
const CRACK_GEN: GenParams = { ...base, width: 5, height: 6, penguins: 2, rocks: 2, cracked: 3 };
const SLEEP_GEN: GenParams = { ...base, width: 5, height: 6, penguins: 3, rocks: 2, sleepers: 1 };

export const DAILY_POOL_SIZE = 42;

const slot = (level: number, gen: GenParams, par: readonly [number, number], extra: Partial<Slot>): Slot => ({
  level,
  id: `d${level}`,
  gen,
  par,
  blocked: [0, 99],
  extraTaps: [0, 99],
  allowDeadEnds: true,
  maxSpins: 1,
  pick: 0.5,
  ...extra,
});

/** Zorluk hafta içinde hafifçe dalgalanır: aynı türün art arda gelenleri farklı dilimden seçilir. */
const PICKS = [0.2, 0.5, 0.8, 0.35, 0.65, 0.1, 0.9] as const;

export const DAILY_SLOTS: readonly Slot[] = Array.from({ length: DAILY_POOL_SIZE }, (_, i) => {
  const level = i + 1;
  const pick = PICKS[Math.floor(i / 3) % PICKS.length]!;
  switch (i % 3) {
    case 0:
      return slot(level, TURN_GEN, [5, 7], { candidates: 20000, minTeamwork: 1, maxSpins: 0, pick });
    case 1:
      return slot(level, CRACK_GEN, [5, 7], { candidates: 40000, minCracks: 1, cracksMatter: true, maxSpins: 0, pick });
    default:
      return slot(level, SLEEP_GEN, [6, 9], { candidates: 30000, maxStates: 4000, maxOptimalFirst: 0.7, pick });
  }
});
