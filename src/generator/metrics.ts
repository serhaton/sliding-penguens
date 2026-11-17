/**
 * Bir bölümün zorluk ölçütleri. Üretici bunlarla adayları sıralar ve seçer.
 *
 * Bu oyunda zorluk nereden gelir? Penguenler tek bir çizgide ilerlediği için
 * bulmaca bir "doğru sıra" bulmacasıdır:
 *  - blocked   : başlangıçta yuvasına tek dokunuşla varamayan penguenler
 *                (önünde biri var → önce o çekilmeli),
 *  - extraTaps : en iyi çözümde bile iki kez dokunulması gereken penguenler
 *                (karşılıklı engelleme: biri yarı yolda "park eder"),
 *  - optimalFirstRatio : ilk hamlelerin ne kadarı en iyi çözüme götürüyor
 *                (düşükse rastgele dokunmak yıldız kaybettirir),
 *  - deadEnds  : kilitlenme tuzakları.
 */
import { computeSlide, createGame, applyMove, legalMoves, replay, type LevelDef } from '@/engine';
import { analyzeLevel, solve } from '@/solver';

export interface Metrics {
  par: number;
  solution: string[];
  penguins: number;
  /** par − penguen sayısı. */
  extraTaps: number;
  blocked: number;
  /** Başlangıçta oynanabilen penguen sayısı. */
  openingMoves: number;
  /** İlk hamlelerden en iyi çözümü koruyanların oranı (0–1). */
  optimalFirstRatio: number;
  /** Ulaşılabilen durum sayısı (sınır aşıldıysa alt sınır). */
  states: number;
  /** Çıkmaz sayısı; durum uzayı tamamen gezilemediyse -1 (bilinmiyor). */
  deadEnds: number;
  losingFirstMoves: number;
  /**
   * En iyi çözümde bir penguenin başka bir penguene çarpıp durduğu hamle
   * sayısı: "park et, çarptır" stratejisinin gerektiği yerler.
   */
  teamwork: number;
  /** En iyi çözümde yerinde dönme (kaymadan) hamlesi sayısı: azı iyidir. */
  spins: number;
  /** Tek sayılık zorluk puanı (yalnızca sıralama için). */
  difficulty: number;
}

export const MEASURE_MAX_STATES = 30_000;

/**
 * Bölüm geçersiz, çözümsüz ya da ölçülemeyecek kadar büyükse null.
 * `maxStates`: gezilecek en fazla durum; düşükse hızlıdır ama büyük durum
 * uzaylı bölümler ölçülemez (çıkmaz sayısı "bilinmiyor" olur ya da null döner).
 */
export function measure(level: LevelDef, maxStates: number = MEASURE_MAX_STATES): Metrics | null {
  const MAX_STATES = maxStates;
  let start;
  try {
    start = createGame(level);
  } catch {
    return null;
  }

  const solved = solve(start, { maxStates: MAX_STATES });
  if (solved.status !== 'solved' || solved.par === 0) return null;
  const analysis = analyzeLevel(start, MAX_STATES);

  const blocked = start.penguins.filter((p) => computeSlide(start, p).enteredIglooId === null).length;

  const firstMoves = legalMoves(start);
  const optimalFirst = firstMoves.filter((move) => {
    const next = solve(applyMove(start, move).state, { maxStates: MAX_STATES });
    return next.status === 'solved' && next.par === solved.par - 1;
  }).length;
  const optimalFirstRatio = firstMoves.length > 0 ? optimalFirst / firstMoves.length : 1;

  // En iyi çözümü oynatıp nasıl hamlelerden oluştuğuna bak.
  const events = replay(start, solved.moves.map((penguinId) => ({ penguinId }))).events;
  const teamwork = events.filter((move) =>
    move.some((e) => e.type === 'bump' && e.obstacle.kind === 'penguin'),
  ).length;
  const spins = events.filter((move) => !move.some((e) => e.type === 'slide')).length;

  const penguins = start.penguins.length;
  const extraTaps = solved.par - penguins;
  const difficulty =
    solved.par +
    blocked * 0.8 +
    extraTaps * 1.5 +
    (1 - optimalFirstRatio) * 3 +
    Math.log2(analysis.states) * 0.4 +
    (!analysis.truncated && analysis.deadEnds > 0 ? 2 + Math.min(3, analysis.losingFirstMoves) : 0);

  return {
    par: solved.par,
    solution: solved.moves,
    penguins,
    extraTaps,
    blocked,
    openingMoves: analysis.openingMoves,
    optimalFirstRatio,
    states: analysis.states,
    deadEnds: analysis.truncated ? -1 : analysis.deadEnds,
    losingFirstMoves: analysis.losingFirstMoves,
    teamwork,
    spins,
    difficulty: Math.round(difficulty * 10) / 10,
  };
}
