import {
  applyMove,
  createGame,
  isStuck,
  legalMoves,
  moveBudgetFor,
  replay,
  starsFor,
  type GameState,
  type LevelDef,
} from '@/engine';

import { analyzeLevel } from '../analyze';
import { getHint } from '../hint';
import { solve } from '../solve';

const make = (def: Omit<LevelDef, 'id'>): GameState => createGame({ id: 'test', ...def });
const play = (state: GameState, ...ids: string[]): GameState =>
  replay(state, ids.map((penguinId) => ({ penguinId }))).state;

/** Tek hamle: penguen doğrudan yuvasına kayar. */
const oneMove = () =>
  make({
    grid: ['....'],
    penguins: [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }],
    igloos: [{ color: 'blue', x: 3, y: 0 }],
  });

/** Sıra önemli: kırmızı b, mavinin yolunda. Önce b çekilirse 2, yoksa 3 hamle. */
const orderMatters = () =>
  make({
    grid: ['.....', '.....', '.....', '.....'],
    penguins: [
      { id: 'a', color: 'blue', dir: 'right', x: 0, y: 1 },
      { id: 'b', color: 'red', dir: 'down', x: 2, y: 1 },
    ],
    igloos: [
      { color: 'blue', x: 4, y: 1 },
      { color: 'red', x: 2, y: 3 },
    ],
  });

/**
 * Fırıldak kilidi. q, r, s bir karenin üç köşesinde, her biri bir sonrakinin
 * önünü kesiyor; dördüncü köşe (2,1) boş. Doğru sıra s → r → q → p.
 * p önce oynanırsa boş köşeye oturur ve dördü birbirini kilitler: çıkmaz.
 *
 *     . . s⌂ .  .        p → sağa   (yuva 4,1)
 *     p . .  q  p⌂       q ↓ aşağı  (yuva 3,3)
 *     r⌂. s  r  .        r ← sola   (yuva 0,2)
 *     . . .  q⌂ .        s ↑ yukarı (yuva 2,0)
 */
const pinwheel = () =>
  make({
    grid: ['.....', '.....', '.....', '.....'],
    penguins: [
      { id: 'p', color: 'blue', dir: 'right', x: 0, y: 1 },
      { id: 'q', color: 'red', dir: 'down', x: 3, y: 1 },
      { id: 'r', color: 'green', dir: 'left', x: 3, y: 2 },
      { id: 's', color: 'yellow', dir: 'up', x: 2, y: 2 },
    ],
    igloos: [
      { color: 'blue', x: 4, y: 1 },
      { color: 'red', x: 3, y: 3 },
      { color: 'green', x: 0, y: 2 },
      { color: 'yellow', x: 2, y: 0 },
    ],
  });

/** Uyuyan z, mavinin yolunda: w çarpıp uyandırır, z çekilir, w devam eder. */
const sleeperAndCrack = () =>
  make({
    grid: ['.+...', '.....', '.....'],
    penguins: [
      { id: 'w', color: 'blue', dir: 'right', x: 0, y: 0 },
      { id: 'z', color: 'green', dir: 'down', x: 3, y: 0, asleep: true },
    ],
    igloos: [
      { color: 'blue', x: 4, y: 0 },
      { color: 'green', x: 3, y: 2 },
    ],
  });

/** Çözümsüz: öndeki penguen çatlağı kırar, arkadaki bir daha geçemez. */
const unsolvable = () =>
  make({
    grid: ['..+..'],
    penguins: [
      { id: 'back', color: 'blue', dir: 'right', x: 0, y: 0 },
      { id: 'front', color: 'blue', dir: 'right', x: 1, y: 0 },
    ],
    igloos: [{ color: 'blue', x: 4, y: 0 }],
  });

/** Kaba kuvvet: en fazla `depth` hamlede bitiren bir dizi var mı? (Tekilleştirme yok.) */
function winnableWithin(state: GameState, depth: number): boolean {
  if (state.result) return true;
  if (depth === 0) return false;
  return legalMoves(state).some((move) => winnableWithin(applyMove(state, move).state, depth - 1));
}

describe('solve', () => {
  it('tek hamlelik bölüm: par 1', () => {
    expect(solve(oneMove())).toMatchObject({ status: 'solved', moves: ['a'], par: 1 });
  });

  it('sıranın önemli olduğu bölümde en kısa sırayı bulur', () => {
    expect(solve(orderMatters())).toMatchObject({ status: 'solved', moves: ['b', 'a'], par: 2 });
  });

  it('kilitlenmeden kaçınan tek sırayı bulur', () => {
    expect(solve(pinwheel())).toMatchObject({ status: 'solved', moves: ['s', 'r', 'q', 'p'], par: 4 });
  });

  it('uyuyan penguen ve çatlak buzla çalışır', () => {
    expect(solve(sleeperAndCrack())).toMatchObject({ status: 'solved', moves: ['w', 'z', 'w'], par: 3 });
  });

  it.each([
    ['oneMove', oneMove],
    ['orderMatters', orderMatters],
    ['pinwheel', pinwheel],
    ['sleeperAndCrack', sleeperAndCrack],
  ])('çözüm motorda oynatılınca bölüm biter: %s', (_name, build) => {
    const result = solve(build());
    if (result.status !== 'solved') throw new Error('çözülmeliydi');
    const end = play(build(), ...result.moves);
    expect(end.result).toMatchObject({ winner: 0, reason: 'allHome' });
    expect(end.moveCount).toBe(result.par);
  });

  it.each([
    ['orderMatters', orderMatters],
    ['pinwheel', pinwheel],
    ['sleeperAndCrack', sleeperAndCrack],
  ])('par gerçekten en az: daha kısa çözüm yok (kaba kuvvetle) — %s', (_name, build) => {
    const result = solve(build());
    if (result.status !== 'solved') throw new Error('çözülmeliydi');
    expect(winnableWithin(build(), result.par)).toBe(true);
    expect(winnableWithin(build(), result.par - 1)).toBe(false);
  });

  it('çözümsüz bölümü bildirir', () => {
    expect(solve(unsolvable()).status).toBe('unsolvable');
  });

  it('çıkmaza girilmiş durumu bildirir', () => {
    const locked = play(pinwheel(), 'p');
    expect(isStuck(locked)).toBe(true);
    expect(solve(locked).status).toBe('unsolvable');
  });

  it('bitmiş bölüm: sıfır hamle', () => {
    expect(solve(play(oneMove(), 'a'))).toMatchObject({ status: 'solved', moves: [], par: 0 });
  });

  it('durum sınırı aşılınca "limit" döner', () => {
    expect(solve(pinwheel(), { maxStates: 1 }).status).toBe('limit');
  });

  it('oyun ortasından da çözer', () => {
    // a önce oynandı (b'ye çarpıp durdu): geriye b, a kalır.
    expect(solve(play(orderMatters(), 'a'))).toMatchObject({ moves: ['b', 'a'], par: 2 });
  });

  it('düello durumunu reddeder', () => {
    const duel = make({
      mode: 'duel',
      grid: ['...', '...'],
      penguins: [
        { color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { color: 'orange', team: 1, dir: 'left', x: 2, y: 1 },
      ],
      igloos: [
        { team: 0, x: 2, y: 0 },
        { team: 1, x: 0, y: 1 },
      ],
    });
    expect(() => solve(duel)).toThrow(/tek oyunculu/);
  });

  it('girdi durumunu değiştirmez', () => {
    const start = pinwheel();
    const before = JSON.stringify(start);
    solve(start);
    expect(JSON.stringify(start)).toBe(before);
  });
});

describe('getHint', () => {
  const solution = ['s', 'r', 'q', 'p'];

  it('başlangıçta hazır çözümün ilk hamlesini verir (arama yapmadan)', () => {
    expect(getHint({ state: pinwheel(), solution })).toEqual({
      kind: 'move', penguinId: 's', dir: 'up', movesLeft: 4, source: 'cached',
    });
  });

  it('oyuncu çözüm yolundaysa sıradaki hamleyi hazır çözümden okur', () => {
    const state = play(pinwheel(), 's', 'r');
    const played = [{ penguinId: 's' }, { penguinId: 'r' }];
    expect(getHint({ state, solution, played })).toEqual({
      kind: 'move', penguinId: 'q', dir: 'down', movesLeft: 2, source: 'cached',
    });
  });

  it('oyuncu çözümden saptıysa canlı çözer', () => {
    const state = play(orderMatters(), 'a');
    expect(getHint({ state, solution: ['b', 'a'], played: [{ penguinId: 'a' }] })).toEqual({
      kind: 'move', penguinId: 'b', dir: 'down', movesLeft: 2, source: 'live',
    });
  });

  it('hazır çözüm yoksa canlı çözer', () => {
    expect(getHint({ state: orderMatters() })).toMatchObject({ penguinId: 'b', source: 'live' });
  });

  it('bayat hazır çözüme güvenmez', () => {
    // 'q' başlangıçta kıpırdayamaz: bu çözüm bu bölüme ait olamaz.
    expect(getHint({ state: pinwheel(), solution: ['q', 's'] })).toMatchObject({
      penguinId: 's', source: 'live',
    });
  });

  it('çıkmazda geri almayı işaret eder', () => {
    const state = play(pinwheel(), 'p');
    expect(getHint({ state, solution, played: [{ penguinId: 'p' }] })).toEqual({ kind: 'deadEnd' });
  });

  it('bitmiş bölümde ipucu yok', () => {
    expect(getHint({ state: play(oneMove(), 'a'), solution: ['a'], played: [{ penguinId: 'a' }] })).toEqual({
      kind: 'finished',
    });
  });

  it('ipucunu izleyen oyuncu bölümü par ile bitirir', () => {
    let state = pinwheel();
    const played: { penguinId: string }[] = [];
    for (let i = 0; i < 10 && !state.result; i++) {
      const hint = getHint({ state, played });
      if (hint.kind !== 'move') throw new Error(`beklenmeyen ipucu: ${hint.kind}`);
      state = applyMove(state, { penguinId: hint.penguinId }).state;
      played.push({ penguinId: hint.penguinId });
    }
    expect(state.result).not.toBeNull();
    expect(state.moveCount).toBe(4);
  });
});

describe('analyzeLevel', () => {
  it('sıra önemli ama kilitlenme olmayan bölümde çıkmaz yok', () => {
    expect(analyzeLevel(orderMatters())).toMatchObject({ deadEnds: 0, losingFirstMoves: 0, openingMoves: 2 });
  });

  it('fırıldakta yanlış ilk hamleyi ve çıkmazı bulur', () => {
    // Başlangıçta p ve s oynanabilir; p dördünü kilitler.
    expect(analyzeLevel(pinwheel())).toMatchObject({ deadEnds: 1, losingFirstMoves: 1, openingMoves: 2 });
  });

  it('baştan çözümsüz bölümde her durum çıkmazdır', () => {
    const analysis = analyzeLevel(unsolvable());
    expect(analysis.deadEnds).toBe(analysis.states);
  });

  it('durum sınırı aşılınca bunu bildirir', () => {
    expect(analyzeLevel(pinwheel(), 2).truncated).toBe(true);
  });
});

describe('yıldızlar', () => {
  it("par'da 3, par+2'ye kadar 2, sonrası 1 (kısa bölüm)", () => {
    expect([4, 5, 6, 7, 8, 20].map((moves) => starsFor(moves, 5))).toEqual([3, 3, 2, 2, 1, 1]);
  });

  it('uzun bölümde pay orantılı büyür (%15)', () => {
    // par 40 → pay 6: 46'ya kadar 2 yıldız.
    expect([40, 41, 46, 47].map((moves) => starsFor(moves, 40))).toEqual([3, 2, 2, 1]);
  });

  it('yıldız başına hamle bütçesi', () => {
    expect(moveBudgetFor(3, 5)).toBe(5);
    expect(moveBudgetFor(2, 5)).toBe(7);
    expect(moveBudgetFor(2, 40)).toBe(46);
  });
});
