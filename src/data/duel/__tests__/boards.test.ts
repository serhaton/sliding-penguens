import { playGame } from '@/ai/simulate';
import { createGame, DUEL_RULES } from '@/engine';
import { createRng, duelLayoutKey, isRotationSymmetric } from '@/generator';

import { duelBoardAt, duelBoards, getDuelBoard } from '../index';

describe('düello tahtaları', () => {
  it('ilk sürümde 30 tahta var', () => {
    expect(duelBoards).toHaveLength(30);
  });

  it('kimlikler ve düzenler benzersiz', () => {
    expect(new Set(duelBoards.map((b) => b.id)).size).toBe(duelBoards.length);
    expect(new Set(duelBoards.map(duelLayoutKey)).size).toBe(duelBoards.length);
  });

  it.each(duelBoards.map((board) => [board.id, board] as const))('%s geçerli ve adil', (_id, board) => {
    // Motor tahtayı kabul ediyor (hatalı tanımda createGame fırlatır).
    const state = createGame(board);
    expect(board.mode).toBe('duel');
    expect(state.rules).toEqual(DUEL_RULES);

    // Boyut belgede verilen aralıkta: 5×6 ile 6×8 arası.
    expect(state.width).toBeGreaterThanOrEqual(5);
    expect(state.width).toBeLessThanOrEqual(6);
    expect(state.height).toBeGreaterThanOrEqual(6);
    expect(state.height).toBeLessThanOrEqual(8);

    // İki takım, üçer penguen ve üçer igloo.
    expect(state.teams).toEqual([0, 1]);
    for (const team of state.teams) {
      expect(state.penguins.filter((p) => p.team === team)).toHaveLength(3);
      expect(state.igloos.filter((g) => g.team === team)).toHaveLength(3);
    }

    // Adalet: tahta 180° döndürülünce iki takım yer değiştirir.
    expect(isRotationSymmetric(board)).toBe(true);
  });

  it('bozuk simetri yakalanır', () => {
    const board = duelBoards[0]!;
    const moved = {
      ...board,
      penguins: board.penguins.map((p, i) => (i === 0 ? { ...p, dir: p.dir === 'up' ? ('down' as const) : ('up' as const) } : p)),
    };
    expect(isRotationSymmetric(moved)).toBe(false);
  });

  it('her tahtada bir maç sonuna kadar oynanabiliyor', () => {
    const rng = createRng(1);
    for (const board of duelBoards) {
      const record = playGame(board, rng, { players: ['medium', 'medium'] });
      expect(record.moves).toBeGreaterThan(0);
      expect(record.moves).toBeLessThanOrEqual(DUEL_RULES.moveLimit!);
    }
  });

  it('kimlikle ve sıra numarasıyla tahta bulunur; sıra sona gelince baştan döner', () => {
    expect(getDuelBoard('duel-1')).toBe(duelBoards[0]);
    expect(getDuelBoard('yok')).toBeUndefined();
    expect(duelBoardAt(0)).toBe(duelBoards[0]);
    expect(duelBoardAt(duelBoards.length)).toBe(duelBoards[0]);
    expect(duelBoardAt(-1)).toBe(duelBoards[duelBoards.length - 1]);
  });
});
