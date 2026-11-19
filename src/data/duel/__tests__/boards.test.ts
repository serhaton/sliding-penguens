import { playGame } from '@/ai/simulate';
import { createGame, DUEL_RULES } from '@/engine';
import { createRng, DUEL_TEAM_COLORS, duelLayoutKey, isRotationSymmetric } from '@/generator';

import { duelBoardAt, duelBoards, duelTeamColors, getDuelBoard } from '../index';

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

  it('takım renkleri üreticiyle aynı', () => {
    expect(duelTeamColors).toEqual(DUEL_TEAM_COLORS);
    for (const p of duelBoards[0]!.penguins) expect(p.color).toBe(duelTeamColors[p.team ?? 0]);
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

describe('takım renkleri', () => {
  const { randomRivalColor, recolorDuelBoard } = jest.requireActual('../index') as typeof import('../index');

  it('rakibin rengi oyuncununkinden hep farklıdır', () => {
    for (const mine of ['blue', 'orange', 'red', 'yellow', 'green', 'purple'] as const) {
      for (const r of [0, 0.2, 0.5, 0.99, 1]) expect(randomRivalColor(mine, () => r)).not.toBe(mine);
    }
  });

  it('tahta boyanınca penguenler ve iglolar takım rengini alır, düzen değişmez', () => {
    const board = duelBoards[0]!;
    const painted = recolorDuelBoard(board, ['green', 'red']);
    for (const p of painted.penguins) expect(p.color).toBe(p.team === 1 ? 'red' : 'green');
    for (const g of painted.igloos) expect(g.color).toBe(g.team === 1 ? 'red' : 'green');
    expect(painted.grid).toEqual(board.grid);
    expect(painted.penguins.map((p) => [p.x, p.y, p.dir])).toEqual(board.penguins.map((p) => [p.x, p.y, p.dir]));
    // Boyanmış her tahta motor için geçerlidir ve takımlar aynı kalır.
    for (const each of duelBoards) {
      const game = createGame(recolorDuelBoard(each, ['purple', 'yellow']));
      expect(game.penguins.map((p) => p.team)).toEqual(createGame(each).penguins.map((p) => p.team));
    }
    // Asıl tahta bozulmaz.
    expect(board.penguins[0]!.color).toBe('blue');
  });
});
