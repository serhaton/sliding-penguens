/** Düello: takımlar, sıra, pas, hamle sınırı, kazanma, adalet kuralı. */
import { applyMove } from '../applyMove';
import { legalMoves } from '../rules';
import type { GameState } from '../types';
import { game, penguin, play, types } from './helpers';

/**
 * 6×5 tahta. Takım 0 (mavi) soldan sağa, takım 1 (turuncu) sağdan sola kayar.
 * Igloolar alt satırda, kimsenin yolunda değil: testler sırayı ölçer.
 */
function openBoard(rules = {}): GameState {
  return game(
    ['......', '......', '......', '......', '......'],
    [
      { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
      { id: 'c', color: 'blue', team: 0, dir: 'right', x: 0, y: 1 },
      { id: 'b', color: 'orange', team: 1, dir: 'left', x: 5, y: 2 },
      { id: 'd', color: 'orange', team: 1, dir: 'left', x: 5, y: 3 },
    ],
    [
      { team: 0, x: 0, y: 4 },
      { team: 0, x: 1, y: 4 },
      { team: 1, x: 4, y: 4 },
      { team: 1, x: 5, y: 4 },
    ],
    { mode: 'duel', rules },
  );
}

describe('sıra', () => {
  it('ilk takım başlar; her hamleden sonra sıra değişir', () => {
    const s = openBoard();
    expect(s.teams).toEqual([0, 1]);
    expect(s.turn).toBe(0);

    const first = applyMove(s, { penguinId: 'a' });
    expect(first.state.turn).toBe(1);
    expect(first.events.at(-1)).toEqual({ type: 'turnChange', team: 1, movesInTurn: 1 });

    const second = applyMove(first.state, { penguinId: 'b' });
    expect(second.state.turn).toBe(0);
    expect(second.state.moveCount).toBe(2);
    expect(second.state.turnNumber).toBe(2);
  });

  it('sırası olmayan takımın penguenine dokunmak reddedilir', () => {
    const s = openBoard();
    const outcome = applyMove(s, { penguinId: 'b' });
    expect(outcome.accepted).toBe(false);
    expect(outcome.events[0]).toMatchObject({ reason: 'notYourTurn' });
    expect(outcome.state).toBe(s);
  });

  it('geçerli hamleler yalnızca sıradaki takımın penguenleridir', () => {
    const s = openBoard();
    expect(legalMoves(s)).toEqual([{ penguinId: 'a' }, { penguinId: 'c' }]);
    expect(legalMoves(play(s, 'a'))).toEqual([{ penguinId: 'b' }, { penguinId: 'd' }]);
  });
});

describe('rakip engeldir', () => {
  it('rakibin pengueni yolu keser', () => {
    // Mavi a'nın igloosu (4,1)'de, yolu açık. Turuncu b aşağı kayıp kayanın
    // önünde, tam a'nın yolunda (3,1) durur: a artık yuvasına giremez.
    const s = game(
      ['.....', '.....', '...#.'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 1 },
        { id: 'x', color: 'blue', team: 0, dir: 'right', x: 0, y: 2 },
        { id: 'b', color: 'orange', team: 1, dir: 'down', x: 3, y: 0 },
      ],
      [
        { team: 0, x: 4, y: 1 },
        { team: 0, x: 4, y: 0 },
        { team: 1, x: 0, y: 0 },
      ],
      { mode: 'duel' },
    );
    // Engelsizken a doğrudan yuvaya girer.
    expect(penguin(play(s, 'a'), 'a').status).toBe('home');

    const blocked = play(s, 'x', 'b');
    expect(penguin(blocked, 'b')).toMatchObject({ x: 3, y: 1 });
    const { state, events } = applyMove(blocked, { penguinId: 'a' });
    expect(penguin(state, 'a')).toMatchObject({ x: 2, y: 1, status: 'active' });
    expect(events[1]).toMatchObject({ obstacle: { kind: 'penguin', penguinId: 'b' } });
  });

  it('rakibin igloosu engeldir, kendi takımınınki yuvadır', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'orange', team: 1, dir: 'right', x: 0, y: 1 },
      ],
      [
        { id: 'orangeHome', team: 1, x: 3, y: 0 },
        { id: 'blueHome', team: 0, x: 3, y: 1 },
      ],
      { mode: 'duel' },
    );
    const afterA = applyMove(s, { penguinId: 'a' });
    expect(penguin(afterA.state, 'a')).toMatchObject({ x: 2, y: 0, status: 'active' });
    expect(afterA.events[1]).toMatchObject({ obstacle: { kind: 'igloo', iglooId: 'orangeHome' } });

    const afterB = applyMove(afterA.state, { penguinId: 'b' });
    expect(penguin(afterB.state, 'b')).toMatchObject({ x: 2, y: 1, status: 'active' });
  });

  it('her igloo tek penguen alır: dolu igloo kendi takımı için de engeldir', () => {
    const s = game(
      ['.....', '.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'c', color: 'blue', team: 0, dir: 'right', x: 1, y: 0 },
        { id: 'b', color: 'orange', team: 1, dir: 'right', x: 0, y: 1 },
      ],
      [
        { id: 'first', team: 0, x: 4, y: 0 },
        { id: 'second', team: 0, x: 4, y: 2 },
        { team: 1, x: 0, y: 2 },
      ],
      { mode: 'duel' },
    );
    const after = play(s, 'c', 'b');
    expect(penguin(after, 'c').status).toBe('home');

    const { state, events } = applyMove(after, { penguinId: 'a' });
    expect(penguin(state, 'a')).toMatchObject({ x: 3, y: 0, status: 'active' });
    expect(events[1]).toMatchObject({ obstacle: { kind: 'igloo', iglooId: 'first' } });
  });
});

describe('kazanma', () => {
  it('bütün penguenlerini önce yuvaya sokan kazanır', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'orange', team: 1, dir: 'left', x: 4, y: 1 },
      ],
      [
        { team: 0, x: 3, y: 0 },
        { team: 1, x: 1, y: 1 },
      ],
      { mode: 'duel' },
    );
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(state.result).toEqual({ winner: 0, reason: 'allHome', homeCounts: { 0: 1, 1: 0 } });
    // Oyun bitince sıra değişmez.
    expect(types(events)).toEqual(['slide', 'enterIgloo', 'gameOver']);
  });
});

describe('hamle sınırı', () => {
  it('sınır dolunca yuvasında daha çok pengueni olan kazanır', () => {
    const s = game(
      ['.....', '.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'c', color: 'blue', team: 0, dir: 'right', x: 0, y: 1 },
        { id: 'b', color: 'orange', team: 1, dir: 'left', x: 4, y: 2 },
      ],
      [
        { team: 0, x: 3, y: 0 },
        { team: 0, x: 4, y: 1 },
        { team: 1, x: 0, y: 2 },
      ],
      { mode: 'duel', rules: { moveLimit: 1 } },
    );
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(state.result).toEqual({ winner: 0, reason: 'moveLimit', homeCounts: { 0: 1, 1: 0 } });
    expect(events.at(-1)).toMatchObject({ type: 'gameOver' });
  });

  it('eşitlikte berabere biter', () => {
    const after = play(openBoard({ moveLimit: 2 }), 'a', 'b');
    expect(after.result).toEqual({ winner: null, reason: 'moveLimit', homeCounts: { 0: 0, 1: 0 } });
  });

  it('sınır toplam hamleyi sayar (iki takım birlikte)', () => {
    const s = openBoard({ moveLimit: 3 });
    expect(play(s, 'a', 'b').result).toBeNull();
    expect(play(s, 'a', 'b', 'c').result).not.toBeNull();
  });

  it('son hamlede hepsini yuvaya sokan, sınır dolsa bile "hepsi yuvada" ile kazanır', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'orange', team: 1, dir: 'left', x: 4, y: 1 },
      ],
      [
        { team: 0, x: 3, y: 0 },
        { team: 1, x: 1, y: 1 },
      ],
      { mode: 'duel', rules: { moveLimit: 1 } },
    );
    expect(play(s, 'a').result).toMatchObject({ winner: 0, reason: 'allHome' });
  });
});

describe('pas', () => {
  /** Sabit yön kuralı. Turuncunun tek pengueni duvara bakıyor: hiç hamlesi yok. */
  const build = () =>
    game(
      ['.....', '.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'c', color: 'blue', team: 0, dir: 'right', x: 0, y: 1 },
        { id: 'b', color: 'orange', team: 1, dir: 'left', x: 0, y: 2 },
      ],
      [
        { team: 0, x: 4, y: 2, capacity: 2 },
        { team: 1, x: 2, y: 2 },
      ],
      // Pas yalnızca sabit yön kuralında olur: "çarpınca dön" açıkken önü kapalı
      // penguen yerinde dönebildiği için her zaman bir hamle vardır.
      { mode: 'duel', rules: { turnOnBump: false } },
    );

  it('hamlesi olmayan oyuncu otomatik pas geçer, sıra geri döner', () => {
    const { state, events } = applyMove(build(), { penguinId: 'a' });
    expect(types(events)).toEqual(['slide', 'bump', 'turnChange', 'pass', 'turnChange']);
    expect(events[3]).toEqual({ type: 'pass', team: 1 });
    expect(state.turn).toBe(0);
    expect(state.consecutivePasses).toBe(1);
    // Pas hamle sayılmaz.
    expect(state.moveCount).toBe(1);
    expect(state.result).toBeNull();
  });

  it('iki oyuncu üst üste pas geçerse oyun yuvadaki penguen sayısıyla biter', () => {
    const { state, events } = applyMove(play(build(), 'a'), { penguinId: 'c' });
    // c'den sonra: turuncu pas, mavi de (ikisi de duvarda) pas → oyun biter.
    expect(types(events)).toEqual([
      'slide', 'bump', 'turnChange', 'pass', 'turnChange', 'pass', 'gameOver',
    ]);
    expect(state.result).toEqual({ winner: null, reason: 'noMoves', homeCounts: { 0: 0, 1: 0 } });
  });

  it('bir hamle yapılınca pas sayacı sıfırlanır', () => {
    const afterA = play(build(), 'a');
    expect(afterA.consecutivePasses).toBe(1);
    // c oynar (sayaç 0), sonra iki pas gelir ve oyun biter: sayaç 2.
    expect(play(afterA, 'c').consecutivePasses).toBe(2);
  });
});

describe('adalet kuralı: ikinci oyuncuya ilk turda ekstra hamle', () => {
  it('kapalıyken herkes tur başına tek hamle yapar', () => {
    const s = play(openBoard(), 'a', 'b');
    expect(s.turn).toBe(0);
  });

  it('açıkken ikinci oyuncu yalnızca ilk turunda iki hamle yapar', () => {
    const s = openBoard({ secondPlayerExtraMove: true });

    const first = applyMove(s, { penguinId: 'a' });
    expect(first.events.at(-1)).toEqual({ type: 'turnChange', team: 1, movesInTurn: 2 });

    const second = applyMove(first.state, { penguinId: 'b' });
    expect(second.state.turn).toBe(1);
    expect(second.state.movesLeftInTurn).toBe(1);
    expect(types(second.events)).not.toContain('turnChange');

    const third = applyMove(second.state, { penguinId: 'd' });
    expect(third.state.turn).toBe(0);
    expect(third.events.at(-1)).toEqual({ type: 'turnChange', team: 0, movesInTurn: 1 });

    // Sonraki turlarda ekstra hamle yok.
    const fourth = applyMove(third.state, { penguinId: 'c' });
    expect(fourth.events).toContainEqual({ type: 'turnChange', team: 1, movesInTurn: 1 });
  });

  it('ikinci hamlesi için hamlesi kalmadıysa sıra geçer', () => {
    const s = game(
      ['.....', '.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'c', color: 'blue', team: 0, dir: 'right', x: 0, y: 1 },
        { id: 'b', color: 'orange', team: 1, dir: 'left', x: 4, y: 2 },
      ],
      [
        { team: 0, x: 4, y: 0, capacity: 2 },
        { team: 1, x: 2, y: 0 },
      ],
      { mode: 'duel', rules: { secondPlayerExtraMove: true, turnOnBump: false } },
    );
    // Mavi c oynar; turuncu b sola kayıp duvarda kalır, ikinci hamlesi yok → sıra maviye.
    const after = play(s, 'c', 'b');
    expect(after.turn).toBe(0);
    expect(after.result).toBeNull();
  });
});
