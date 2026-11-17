/**
 * Macera 3 (Uyuyan Penguen) zorluk eğrisi. Kural: uyuyan penguen engel gibi
 * durur, oynanamaz; başka bir penguen ona çarpınca uyanır. Uyuyan da yuvasına
 * girmeden bölüm bitmez: önce ona ulaşacak bir çarpma kurmak gerekir.
 * "Çarpınca dön" kuralı bütün macerada açıktır.
 *
 *   A (61–70) Uyku Vadisi: önce iki, sonra üç penguen; biri uyuyor. 61 elle yazılmış öğretici.
 *   B (71–80) Horultu Tepesi: üç penguen; sonra çatlak buzla birlikte, sonra iki uykucu.
 *   C (81–90) Rüya Koyu: dalgalar; uykucular ve çatlak buz bir arada.
 *
 * Üretim: npm run levels:generate -- --part 3a|3b|3c --write
 */
import type { GenParams } from './generate';
import type { Slot } from './select';
import type { WaveLevelParams, WaveSpec } from './waves';

const TURN = { turnOnBump: true } as const;

const gen = (
  width: number,
  height: number,
  penguins: number,
  rocks: number,
  sleepers: number,
  cracked = 0,
): GenParams => ({
  width,
  height,
  penguins,
  rocks,
  water: 0,
  freeIgloos: true,
  rules: TURN,
  sleepers,
  ...(cracked > 0 ? { cracked } : {}),
});

const slot = (level: number, g: GenParams, par: readonly [number, number], extra: Partial<Slot> = {}): Slot => ({
  level,
  gen: g,
  par,
  blocked: [0, 99],
  extraTaps: [0, 99],
  allowDeadEnds: true,
  maxSpins: 0,
  pick: 0.5,
  ...extra,
});

const TWO = gen(5, 6, 2, 2, 1);
const SMALL_THREE = gen(5, 6, 3, 2, 1);
const THREE = gen(6, 6, 3, 3, 1);
const THREE_CRACKED = gen(6, 7, 3, 2, 1, 2);
const THREE_TWO_ASLEEP = gen(6, 7, 3, 3, 2);
const two = { candidates: 40000 } as const;
const three = { candidates: 16000, maxStates: 4000, maxSpins: 1 } as const;
const cracked = { minCracks: 1, cracksMatter: true } as const;

/** Seçim şart: ilk hamlelerin hepsi doğru olmasın. */
const choice = { maxOptimalFirst: 0.7 } as const;
/** Üç penguenli "çarpınca dön" tahtalarında çıkmazsız olanı çok nadir: oyun çıkmazı fark edip "geri al" der. */
const early = { candidates: 30000, maxStates: 4000, maxSpins: 1 } as const;

export const WORLD3_A_SLOTS: readonly Slot[] = [
  // İki penguen, biri uyuyor: tek yol var, kuralı pekiştirir.
  slot(62, TWO, [3, 4], { ...two, allowDeadEnds: false, pick: 0.3 }),
  slot(63, TWO, [5, 6], { ...two, allowDeadEnds: false }),
  // Üç penguen, biri uyuyor: kim uyandıracak, kim nerede duracak?
  slot(64, SMALL_THREE, [5, 6], { ...early, ...choice, pick: 0 }),
  slot(65, SMALL_THREE, [5, 6], { ...early, ...choice, pick: 0.5 }),
  slot(66, SMALL_THREE, [6, 7], { ...early, ...choice, pick: 0.2 }),
  slot(67, SMALL_THREE, [6, 7], { ...early, ...choice, pick: 0.6 }),
  slot(68, SMALL_THREE, [7, 8], { ...early, ...choice, pick: 0.3 }),
  slot(69, SMALL_THREE, [7, 8], { ...early, ...choice, pick: 0.7 }),
  slot(70, SMALL_THREE, [8, 9], { ...early, ...choice, pick: 0.7 }),
];

const wide = { ...three, candidates: 30000 } as const;

export const WORLD3_B_SLOTS: readonly Slot[] = [
  slot(71, THREE, [6, 7], { ...three, pick: 0.2 }),
  slot(72, THREE, [7, 7], { ...three }),
  slot(73, THREE, [7, 8], { ...three, pick: 0.7 }),
  slot(74, THREE, [8, 9], { ...three, minTeamwork: 2 }),
  // Çatlak buz geri döner.
  slot(75, THREE_CRACKED, [7, 9], { ...wide, ...cracked, pick: 0 }),
  slot(76, THREE_CRACKED, [8, 10], { ...wide, ...cracked }),
  slot(77, THREE_CRACKED, [9, 12], { ...wide, ...cracked, pick: 0.7 }),
  // İki uykucu: biri uyanıp ötekini uyandırır.
  slot(78, THREE_TWO_ASLEEP, [7, 9], { ...wide, pick: 0 }),
  slot(79, THREE_TWO_ASLEEP, [8, 10], { ...wide }),
  slot(80, THREE_TWO_ASLEEP, [10, 12], { ...wide, pick: 0.7 }),
];

const solo = (min: number, max: number): WaveSpec => ({ penguins: 1, par: [min, max] });
/** İki penguen, biri uyuyor. */
const nap = (min: number, max: number): WaveSpec => ({
  penguins: 2,
  par: [min, max],
  sleepers: 1,
  minTeamwork: 1,
  allowDeadEnds: true,
});
/** İki uyanık penguen; çatlak işe karışır. */
const crack = (min: number, max: number): WaveSpec => ({
  penguins: 2,
  par: [min, max],
  cracksMatter: true,
  allowDeadEnds: true,
});
/** Üç penguen, `sleepers` tanesi uyuyor. */
const trio = (min: number, max: number, sleepers = 1): WaveSpec => ({
  penguins: 3,
  par: [min, max],
  sleepers,
  minTeamwork: 1,
  maxSpins: 1,
  allowDeadEnds: true,
});

const waves = (
  level: number,
  width: number,
  height: number,
  colors: number,
  cracked: number,
  specs: WaveSpec[],
): WaveLevelParams & { level: number } => ({
  level,
  width,
  height,
  rocks: Math.round((width * height) / 16),
  ...(cracked > 0 ? { cracked } : {}),
  colors,
  rules: TURN,
  maxStates: 4000,
  waves: specs,
});

export const WORLD3_C_LEVELS: readonly (WaveLevelParams & { level: number })[] = [
  waves(81, 5, 6, 3, 0, [solo(2, 3), nap(3, 4), nap(4, 5), nap(4, 6)]),
  waves(82, 5, 6, 3, 0, [nap(3, 4), nap(4, 5), nap(5, 6), nap(5, 7)]),
  waves(83, 6, 6, 4, 0, [nap(4, 5), nap(5, 6), trio(5, 7), nap(5, 7), nap(6, 8)]),
  waves(84, 6, 6, 4, 3, [nap(4, 5), crack(4, 5), nap(5, 6), crack(5, 6), nap(6, 8)]),
  // Rahatlatıcı.
  waves(85, 5, 6, 3, 0, [solo(2, 3), nap(3, 4), nap(4, 5), nap(4, 5)]),
  waves(86, 6, 6, 4, 3, [nap(4, 5), crack(5, 6), trio(5, 7), nap(5, 7), crack(6, 7)]),
  waves(87, 6, 7, 4, 3, [nap(4, 6), trio(5, 7), crack(5, 6), nap(6, 8), trio(6, 8)]),
  waves(88, 6, 7, 4, 3, [nap(5, 6), trio(5, 7), crack(6, 7), trio(7, 10, 2), nap(6, 8)]),
  waves(89, 6, 7, 4, 4, [crack(5, 6), trio(5, 7), nap(6, 8), trio(6, 8, 2), trio(7, 9)]),
  // Kıta finali.
  waves(90, 6, 8, 5, 4, [nap(4, 5), crack(5, 6), trio(6, 7), nap(6, 8), trio(7, 8, 2), trio(8, 10)]),
];
