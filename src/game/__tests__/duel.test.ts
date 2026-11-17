import { duelBoards } from '@/data/duel';
import { applyMove, legalMoves } from '@/engine';

import {
  addGame,
  homeCount,
  movesLeft,
  otherTeam,
  outcomeFor,
  SERIES_WINS,
  seriesWinner,
  startDuel,
  teamSize,
} from '../duel';

const board = duelBoards[0]!;

describe('düello kurulumu', () => {
  it('başlayan takım seçilebilir; tahta aynı kalır', () => {
    const blueFirst = startDuel(board, 0);
    const orangeFirst = startDuel(board, 1);
    expect(blueFirst.turn).toBe(0);
    expect(orangeFirst.turn).toBe(1);
    expect(orangeFirst.penguins).toEqual(blueFirst.penguins);
    // İlk hamleyi yalnızca başlayan takım yapabilir.
    expect(legalMoves(orangeFirst).every((m) => m.penguinId.startsWith('b'))).toBe(true);
  });

  it('turuncu başlayınca sıra maviye geçer', () => {
    const s = startDuel(board, 1);
    const next = applyMove(s, legalMoves(s)[0]!).state;
    expect(next.turn).toBe(0);
  });

  it('rövanşta başlayan değişir', () => {
    expect(otherTeam(0)).toBe(1);
    expect(otherTeam(1)).toBe(0);
  });

  it('sayaçlar: yuvadaki penguen, takım boyu, kalan hamle', () => {
    const s = startDuel(board, 0);
    expect(homeCount(s, 0)).toBe(0);
    expect(teamSize(s, 0)).toBe(3);
    expect(movesLeft(s)).toBe(30);
    expect(movesLeft(applyMove(s, legalMoves(s)[0]!).state)).toBe(29);
    expect(movesLeft({ ...s, rules: { ...s.rules, moveLimit: null } })).toBeNull();
  });

  it('sonuç her takım için ayrı okunur', () => {
    const s = startDuel(board, 0);
    expect(outcomeFor(s, 0)).toBeNull();
    const won = { ...s, result: { winner: 0, reason: 'allHome' as const, homeCounts: { 0: 3, 1: 1 } } };
    expect(outcomeFor(won, 0)).toBe('win');
    expect(outcomeFor(won, 1)).toBe('loss');
    const drawn = { ...s, result: { winner: null, reason: 'moveLimit' as const, homeCounts: { 0: 2, 1: 2 } } };
    expect(outcomeFor(drawn, 0)).toBe('draw');
    expect(outcomeFor(drawn, 1)).toBe('draw');
  });
});

describe('düello serisi', () => {
  it('kazanılan oyun kazanana yazılır; berabere kimseye yazılmaz', () => {
    expect(addGame([0, 0], 0)).toEqual([1, 0]);
    expect(addGame([1, 0], 1)).toEqual([1, 1]);
    expect(addGame([1, 1], null)).toEqual([1, 1]);
  });

  it('üç oyun kazanan düelloyu alır', () => {
    expect(SERIES_WINS).toBe(3);
    expect(seriesWinner([2, 2])).toBeNull();
    expect(seriesWinner([3, 2])).toBe(0);
    expect(seriesWinner([1, 3])).toBe(1);
  });

  it('seri en fazla beş sonuçlanan oyunda biter', () => {
    let score = [0, 0] as readonly [number, number];
    let games = 0;
    // En uzun seri: galibiyetler sırayla gider.
    while (seriesWinner(score) === null) {
      score = addGame(score, games % 2 === 0 ? 0 : 1);
      games++;
    }
    expect(games).toBe(5);
    expect(score).toEqual([3, 2]);
  });
});
