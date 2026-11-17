/**
 * Macera 2 (Çatlak Buz) zorluk eğrisi. Kural: çatlak buz bir kez taşır; üstünden
 * ayrılan penguenin ardından suya döner ve engel olur. Çatlak hem tuzaktır
 * (kendi yolunu kesersin) hem araçtır (kırıp bir durak yaratırsın).
 * "Çarpınca dön" kuralı bütün macerada açıktır.
 *
 *   A (31–40) İnce Buz: iki penguen, birkaç çatlak. 31–32 elle yazılmış öğretici.
 *   B (41–50) Kırık Geçit: daha büyük tahta, "park et, çarptır" ile birlikte; sonra üç penguen.
 *   C (51–60) Buzul Gölü: dalgalar. Her dalgada buz yeniden donar.
 *
 * Üretim: npm run levels:generate -- --part 2a|2b|2c --write
 */
import type { GenParams } from './generate';
import type { Slot } from './select';
import type { WaveLevelParams, WaveSpec } from './waves';

const TURN = { turnOnBump: true } as const;

const gen = (width: number, height: number, penguins: number, rocks: number, cracked: number): GenParams => ({
  width,
  height,
  penguins,
  rocks,
  water: 0,
  freeIgloos: true,
  rules: TURN,
  cracked,
});

/** Çatlaklar süs olamaz: bulmacayı değiştirmeli ve en iyi çözümde en az biri kırılmalı. */
const slot = (level: number, g: GenParams, par: readonly [number, number], extra: Partial<Slot> = {}): Slot => ({
  level,
  gen: g,
  par,
  blocked: [0, 99],
  extraTaps: [0, 99],
  allowDeadEnds: true,
  maxSpins: 0,
  minCracks: 1,
  cracksMatter: true,
  pick: 0.5,
  ...extra,
});

const TWO = gen(5, 6, 2, 2, 3);
const TWO_WIDE = gen(6, 6, 2, 3, 4);
const THREE = gen(6, 6, 3, 3, 3);
const two = { candidates: 40000 } as const;
const three = { candidates: 16000, maxStates: 4000, maxSpins: 1 } as const;

export const WORLD2_A_SLOTS: readonly Slot[] = [
  // Çatlak geri alınamaz olduğu için çıkmazsız ve seçimli tahta neredeyse yok:
  // yanlış kırınca oyun çıkmazı fark edip "geri al" der.
  slot(33, TWO, [3, 4], { ...two, allowDeadEnds: false, pick: 0 }),
  slot(34, TWO, [4, 5], { ...two, maxOptimalFirst: 0.5, pick: 0.2 }),
  slot(35, TWO, [5, 5], { ...two, maxOptimalFirst: 0.5, pick: 0.3 }),
  slot(36, TWO, [5, 6], { ...two }),
  slot(37, TWO, [6, 6], { ...two }),
  slot(38, TWO, [6, 7], { ...two, minCracks: 2 }),
  slot(39, TWO, [7, 7], { ...two, minCracks: 2 }),
  slot(40, TWO, [7, 8], { ...two, minCracks: 2, pick: 0.7 }),
];

export const WORLD2_B_SLOTS: readonly Slot[] = [
  slot(41, TWO_WIDE, [5, 6], { ...two, minTeamwork: 1, pick: 0.3 }),
  slot(42, TWO_WIDE, [6, 7], { ...two, minTeamwork: 1 }),
  slot(43, TWO_WIDE, [7, 8], { ...two, minTeamwork: 1, minCracks: 2 }),
  slot(44, TWO_WIDE, [8, 9], { ...two, minTeamwork: 1, minCracks: 2 }),
  // Rahatlatıcı.
  slot(45, TWO_WIDE, [5, 6], { ...two, minTeamwork: 1, pick: 0.2 }),
  slot(46, THREE, [6, 7], { ...three, pick: 0.3 }),
  slot(47, THREE, [7, 8], { ...three }),
  slot(48, THREE, [8, 9], { ...three, minTeamwork: 1 }),
  slot(49, THREE, [9, 10], { ...three, minTeamwork: 1 }),
  slot(50, THREE, [10, 12], { ...three, minTeamwork: 1, minCracks: 2, pick: 0.7 }),
];

const solo = (min: number, max: number): WaveSpec => ({ penguins: 1, par: [min, max] });
/** Çatlağın işe karıştığı iki penguenli dalga. */
const crack = (min: number, max: number): WaveSpec => ({
  penguins: 2,
  par: [min, max],
  cracksMatter: true,
  allowDeadEnds: true,
});
const duo = (min: number, max: number, minTeamwork = 1): WaveSpec => ({
  penguins: 2,
  par: [min, max],
  minTeamwork,
  allowDeadEnds: true,
});
const trio = (min: number, max: number): WaveSpec => ({
  penguins: 3,
  par: [min, max],
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
  cracked,
  colors,
  rules: TURN,
  maxStates: 4000,
  waves: specs,
});

export const WORLD2_C_LEVELS: readonly (WaveLevelParams & { level: number })[] = [
  waves(51, 5, 6, 3, 2, [solo(2, 3), crack(3, 4), duo(3, 5), crack(4, 5)]),
  waves(52, 5, 6, 3, 3, [crack(3, 4), duo(4, 5), crack(4, 5), crack(5, 6)]),
  waves(53, 5, 6, 3, 3, [crack(4, 5), crack(4, 5), duo(5, 6), crack(5, 6), crack(6, 7)]),
  waves(54, 6, 6, 4, 3, [crack(3, 4), duo(4, 5), crack(5, 6), crack(5, 6), duo(6, 7, 2)]),
  // Rahatlatıcı.
  waves(55, 5, 6, 3, 2, [solo(2, 3), crack(3, 4), crack(4, 5), duo(4, 5)]),
  waves(56, 6, 6, 4, 3, [crack(4, 5), crack(5, 6), trio(5, 7), crack(5, 6), duo(6, 7, 2)]),
  waves(57, 6, 7, 4, 4, [crack(4, 5), crack(5, 6), trio(5, 7), crack(6, 7), trio(6, 8)]),
  waves(58, 6, 7, 4, 4, [crack(5, 6), trio(5, 7), crack(6, 7), trio(6, 8), crack(6, 8)]),
  waves(59, 6, 7, 4, 4, [crack(5, 6), trio(5, 7), crack(6, 7), trio(6, 8), trio(7, 9)]),
  // Macera finali.
  waves(60, 6, 8, 5, 5, [crack(4, 5), crack(5, 6), trio(6, 7), crack(6, 7), trio(7, 8), trio(8, 10)]),
];
