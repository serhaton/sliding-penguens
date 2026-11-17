/**
 * Dünya 1 (Buz Kıyısı) zorluk eğrisi. Üç bölümden oluşur; zorluk, kuralların
 * kendisinden gelir:
 *
 *   A (1–10)  Sabit yön: penguenler tek çizgide gider; bulmaca "kimi önce
 *             çekeceğim". 1–4 elle yazılmış öğretici, 5–10 buradan.
 *   B (11–20) Çarpınca dön: nerede durduğun önem kazanır ("park et, çarptır").
 *             11–12 elle yazılmış öğretici, 13–20 buradan.
 *   C (21–30) Dalgalar: aynı tahtada art arda gelen gruplar; uzun bölümler.
 *
 * Elle yazılmış bölümler: src/data/levels/handmade.ts
 * Üretim: npm run levels:generate -- --part a|b|c --write
 */
import type { GenParams } from './generate';
import type { Slot } from './select';
import type { WaveLevelParams, WaveSpec } from './waves';

const TURN = { turnOnBump: true } as const;

// ---------------------------------------------------------------------------
// A — sabit yön (5–10)
// ---------------------------------------------------------------------------

const genA = (width: number, height: number, penguins: number, extra: Partial<GenParams> = {}): GenParams => ({
  width,
  height,
  penguins,
  rocks: 2,
  water: 1,
  blockBias: 0.6,
  ...extra,
});

const slotA = (level: number, gen: GenParams, blocked: readonly [number, number], pick: number): Slot => ({
  level,
  gen,
  par: [gen.penguins + (gen.twins ?? 0), 99],
  blocked,
  extraTaps: [0, 99],
  allowDeadEnds: false,
  pick,
});

export const WORLD1_A_SLOTS: readonly Slot[] = [
  slotA(5, genA(5, 6, 3), [1, 1], 0.3),
  slotA(6, genA(5, 6, 3), [2, 2], 0.5),
  slotA(7, genA(6, 6, 4), [2, 2], 0.4),
  slotA(8, genA(6, 6, 4), [2, 3], 0.8),
  slotA(9, genA(6, 7, 5), [3, 3], 0.5),
  slotA(10, genA(6, 7, 4, { twins: 1 }), [3, 4], 0.7),
];

// ---------------------------------------------------------------------------
// B — çarpınca dön (13–20)
// ---------------------------------------------------------------------------

const genB = (width: number, height: number, penguins: number, rocks: number): GenParams => ({
  width,
  height,
  penguins,
  rocks,
  water: 0,
  freeIgloos: true,
  rules: TURN,
});

const slotB = (level: number, gen: GenParams, par: readonly [number, number], extra: Partial<Slot> = {}): Slot => ({
  level,
  gen,
  par,
  blocked: [0, 99],
  extraTaps: [0, 99],
  allowDeadEnds: false,
  maxSpins: 0,
  pick: 0.5,
  ...extra,
});

const ONE = genB(5, 5, 1, 2);
const TWO = genB(5, 6, 2, 2);
const THREE = genB(6, 6, 3, 3);
/** İki penguenli ölçüm ucuz: büyük havuz. Üç penguenli pahalı: küçük havuz, sınırlı ölçüm. */
const two = { candidates: 20000 } as const;
const three = { candidates: 2500, maxStates: 4000, allowDeadEnds: true, maxSpins: 1 } as const;

export const WORLD1_B_SLOTS: readonly Slot[] = [
  // Tek penguen: dönerek yuvayı bulma.
  slotB(13, ONE, [3, 3], { candidates: 3000 }),
  slotB(14, ONE, [4, 4], { candidates: 3000 }),
  // İlk "park et, çarptır": iki penguen, en kolayı.
  slotB(15, TWO, [3, 4], { ...two, minTeamwork: 1, pick: 0 }),
  slotB(16, TWO, [4, 4], { ...two, minTeamwork: 1 }),
  slotB(17, TWO, [5, 5], { ...two, minTeamwork: 1 }),
  slotB(18, TWO, [6, 6], { ...two, minTeamwork: 1 }),
  slotB(19, TWO, [7, 7], { ...two, minTeamwork: 2, maxSpins: 1 }),
  // Üç penguen: çıkmaz olabilir (oyun fark edip "geri al" der).
  slotB(20, THREE, [6, 7], { ...three, minTeamwork: 1 }),
];

// ---------------------------------------------------------------------------
// C — dalgalı uzun bölümler (21–30)
// ---------------------------------------------------------------------------

const solo = (min: number, max: number): WaveSpec => ({ penguins: 1, par: [min, max] });
const duo = (min: number, max: number, minTeamwork = 1): WaveSpec => ({ penguins: 2, par: [min, max], minTeamwork });
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
  specs: WaveSpec[],
): WaveLevelParams & { level: number } => ({
  level,
  width,
  height,
  rocks: Math.round((width * height) / 14),
  colors,
  rules: TURN,
  maxStates: 4000,
  waves: specs,
});

export const WORLD1_C_LEVELS: readonly (WaveLevelParams & { level: number })[] = [
  waves(21, 5, 6, 3, [solo(1, 2), solo(2, 3), duo(3, 4), duo(4, 5)]),
  waves(22, 5, 6, 3, [duo(3, 4), duo(4, 4), duo(4, 5), duo(5, 6)]),
  waves(23, 5, 6, 3, [duo(4, 5), duo(4, 5), duo(5, 6), duo(5, 6), duo(6, 7, 2)]),
  waves(24, 6, 6, 4, [duo(3, 4), duo(4, 5), duo(5, 5), duo(5, 6), duo(6, 7, 2)]),
  // Rahatlatıcı: kısa ve kolay.
  waves(25, 5, 6, 3, [solo(2, 3), duo(3, 4), duo(4, 5), duo(4, 5)]),
  waves(26, 6, 6, 4, [duo(4, 5), duo(5, 6), trio(5, 6), duo(5, 6), duo(6, 7, 2)]),
  waves(27, 6, 7, 4, [duo(4, 5), duo(5, 6), trio(5, 6), duo(5, 6), trio(6, 7)]),
  waves(28, 6, 7, 4, [duo(5, 6), trio(5, 6), duo(6, 7, 2), trio(6, 7), duo(6, 8, 2)]),
  waves(29, 6, 7, 4, [duo(5, 6), trio(5, 6), duo(6, 7, 2), trio(6, 7), trio(7, 8)]),
  // Dünya finali.
  waves(30, 6, 8, 5, [duo(4, 5), duo(5, 6), trio(6, 7), duo(6, 7, 2), trio(7, 8), trio(8, 9)]),
];
