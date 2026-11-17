/** Tek oyunculu kurallar: kayma, çarpma, igloo, yıldız öncesi her şey. */
import { applyMove } from '../applyMove';
import { isStuck, legalMoves } from '../rules';
import { deepFreeze, game, penguin, play, types } from './helpers';

describe('kayma ve çarpma', () => {
  it('penguen baktığı yönde tahta kenarına kadar kayar', () => {
    const s = game(['.....', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ]);
    const { state, events, accepted } = applyMove(s, { penguinId: 'a' });

    expect(accepted).toBe(true);
    expect(penguin(state, 'a')).toMatchObject({ x: 4, y: 0, status: 'active' });
    expect(events).toEqual([
      { type: 'slide', penguinId: 'a', dir: 'right', from: { x: 0, y: 0 }, to: { x: 4, y: 0 }, distance: 4 },
      { type: 'bump', penguinId: 'a', at: { x: 4, y: 0 }, obstacle: { kind: 'wall' } },
    ]);
    expect(state.moveCount).toBe(1);
  });

  it.each([
    ['up', 2, 0],
    ['down', 2, 4],
    ['left', 0, 2],
    ['right', 4, 2],
  ] as const)('dört yön: %s', (dir, x, y) => {
    const s = game(['.....', '.....', '.....', '.....', '.....'], [{ id: 'a', color: 'blue', dir, x: 2, y: 2 }], [
      { color: 'blue', x: 0, y: 0 },
    ]);
    expect(penguin(play(s, 'a'), 'a')).toMatchObject({ x, y });
  });

  it('kayanın hemen önünde durur', () => {
    const s = game(['...#.', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ]);
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(penguin(state, 'a')).toMatchObject({ x: 2, y: 0 });
    expect(events[1]).toMatchObject({ type: 'bump', obstacle: { kind: 'rock' } });
  });

  it('suyun hemen önünde durur', () => {
    const s = game(['..~..', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ]);
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(penguin(state, 'a')).toMatchObject({ x: 1, y: 0 });
    expect(events[1]).toMatchObject({ type: 'bump', obstacle: { kind: 'water' } });
  });

  it('başka bir penguenin hemen önünde durur', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'red', dir: 'down', x: 3, y: 0 },
      ],
      [
        { color: 'blue', x: 0, y: 1 },
        { color: 'red', x: 1, y: 1 },
      ],
    );
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(penguin(state, 'a')).toMatchObject({ x: 2, y: 0 });
    expect(events[1]).toMatchObject({ type: 'bump', obstacle: { kind: 'penguin', penguinId: 'b' } });
  });

  it('asıl strateji: park edilen penguen durma noktası yaratır', () => {
    const s = game(
      ['.....', '.....', '.....'],
      [
        { id: 'blue', color: 'blue', dir: 'right', x: 0, y: 2 },
        { id: 'red', color: 'red', dir: 'down', x: 3, y: 0 },
      ],
      [
        { color: 'blue', x: 4, y: 0 },
        { color: 'red', x: 0, y: 0 },
      ],
    );
    // Park etmeden mavi sağ kenara kadar gider.
    expect(penguin(play(s, 'blue'), 'blue')).toMatchObject({ x: 4, y: 2 });
    // Kırmızı aşağı inip (3,2)'ye park eder; mavi ona çarpıp (2,2)'de durur.
    const after = play(s, 'red', 'blue');
    expect(penguin(after, 'red')).toMatchObject({ x: 3, y: 2 });
    expect(penguin(after, 'blue')).toMatchObject({ x: 2, y: 2 });
  });
});

describe('hareket edemeyen penguen', () => {
  const s = game(['.#...', '.....'], [
    { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
    { id: 'b', color: 'blue', dir: 'right', x: 2, y: 0 },
  ], [{ color: 'blue', x: 0, y: 1 }]);

  it('reddedilir, hamle sayılmaz, durum aynı nesne olarak kalır', () => {
    const { state, events, accepted } = applyMove(s, { penguinId: 'a' });
    expect(accepted).toBe(false);
    expect(state).toBe(s);
    expect(state.moveCount).toBe(0);
    expect(events).toEqual([
      { type: 'rejected', penguinId: 'a', reason: 'blocked', obstacle: { kind: 'rock' } },
    ]);
  });

  it('geçerli hamleler listesinde yer almaz', () => {
    expect(legalMoves(s)).toEqual([{ penguinId: 'b' }]);
  });

  it('bilinmeyen penguen reddedilir', () => {
    expect(applyMove(s, { penguinId: 'yok' }).events[0]).toMatchObject({ reason: 'unknownPenguin' });
  });
});

describe('igloo', () => {
  it('penguen kendi rengindeki igloya girer ve tahtadan çıkar', () => {
    const s = game(['.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { id: 'home', color: 'blue', x: 3, y: 0 },
    ]);
    const { state, events } = applyMove(s, { penguinId: 'a' });

    expect(penguin(state, 'a')).toMatchObject({ status: 'home', x: 3, y: 0 });
    expect(state.igloos[0]).toMatchObject({ occupants: 1 });
    expect(types(events)).toEqual(['slide', 'enterIgloo', 'gameOver']);
    expect(events[0]).toMatchObject({ to: { x: 3, y: 0 }, distance: 3 });
  });

  it('hemen yanındaki igloya da girer (tek adım)', () => {
    const s = game(['..'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 1, y: 0 },
    ]);
    expect(penguin(play(s, 'a'), 'a').status).toBe('home');
  });

  it('başka renkteki igloo engeldir', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'red', dir: 'right', x: 0, y: 1 },
      ],
      [
        { id: 'redHome', color: 'red', x: 3, y: 0 },
        { id: 'blueHome', color: 'blue', x: 4, y: 1 },
      ],
    );
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(penguin(state, 'a')).toMatchObject({ x: 2, y: 0, status: 'active' });
    expect(events[1]).toMatchObject({ type: 'bump', obstacle: { kind: 'igloo', iglooId: 'redHome' } });
  });

  it('igloo, sahibi içeri girdikten sonra da diğerleri için engel olmaya devam eder', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'red', color: 'red', dir: 'right', x: 2, y: 0 },
        { id: 'blue', color: 'blue', dir: 'right', x: 0, y: 0 },
      ],
      [
        { color: 'red', x: 3, y: 0 },
        { color: 'blue', x: 4, y: 1 },
      ],
    );
    const after = play(s, 'red', 'blue');
    expect(penguin(after, 'red').status).toBe('home');
    // Yuvaya giren kırmızı artık engel değil, ama igloo öyle: mavi (2,0)'da durur.
    expect(penguin(after, 'blue')).toMatchObject({ x: 2, y: 0 });
  });

  it('aynı renkten birden fazla penguen aynı igloya girer', () => {
    const s = game(
      ['.....'],
      [
        { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'blue', dir: 'right', x: 1, y: 0 },
      ],
      [{ color: 'blue', x: 4, y: 0 }],
    );
    const afterFirst = play(s, 'b');
    expect(afterFirst.result).toBeNull();

    const afterBoth = play(afterFirst, 'a');
    expect(afterBoth.igloos[0]).toMatchObject({ occupants: 2 });
    expect(afterBoth.result).toMatchObject({ winner: 0, reason: 'allHome' });
  });
});

describe('bölüm sonu', () => {
  const s = game(
    ['.....', '.....'],
    [
      { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
      { id: 'b', color: 'red', dir: 'left', x: 4, y: 1 },
    ],
    [
      { color: 'blue', x: 4, y: 0 },
      { color: 'red', x: 0, y: 1 },
    ],
  );

  it('bütün penguenler yuvaya girince biter', () => {
    const mid = play(s, 'a');
    expect(mid.result).toBeNull();

    const { state, events } = applyMove(mid, { penguinId: 'b' });
    expect(state.result).toEqual({ winner: 0, reason: 'allHome', homeCounts: { 0: 2 } });
    expect(events.at(-1)).toEqual({ type: 'gameOver', result: state.result });
    expect(state.moveCount).toBe(2);
  });

  it('bittikten sonra hamle kabul edilmez', () => {
    const done = play(s, 'a', 'b');
    const again = applyMove(done, { penguinId: 'a' });
    expect(again.accepted).toBe(false);
    expect(again.events[0]).toMatchObject({ reason: 'gameOver' });
    expect(legalMoves(done)).toEqual([]);
  });

  it('yuvadaki penguene dokunmak reddedilir', () => {
    const mid = play(s, 'a');
    expect(applyMove(mid, { penguinId: 'a' }).events[0]).toMatchObject({ reason: 'notActive' });
  });

  it('tek oyunculuda sıra hiç değişmez, pas olayı çıkmaz', () => {
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(state.turn).toBe(0);
    expect(types(events)).not.toContain('turnChange');
    expect(types(events)).not.toContain('pass');
  });

  it('hamle kalmayınca oyun bitmez: sıkışma ayrı bildirilir (kaybetmek yok)', () => {
    const stuckLevel = game(['...', '...'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ]);
    expect(isStuck(stuckLevel)).toBe(false);
    const after = play(stuckLevel, 'a');
    expect(after.result).toBeNull();
    expect(isStuck(after)).toBe(true);
  });
});

describe('saflık', () => {
  it('girdi durumunu değiştirmez', () => {
    const s = deepFreeze(
      game(
        ['.+...', '.....'],
        [
          { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
          { id: 'z', color: 'red', dir: 'left', x: 4, y: 0, asleep: true },
        ],
        [
          { color: 'blue', x: 0, y: 1 },
          { color: 'red', x: 1, y: 1 },
        ],
      ),
    );
    const before = JSON.stringify(s);
    // Dondurulmuş nesneye yazma denemesi katı kipte hata fırlatır.
    expect(() => applyMove(s, { penguinId: 'a' })).not.toThrow();
    expect(JSON.stringify(s)).toBe(before);
  });

  it('belirlenimci: aynı durum + aynı hamle = aynı sonuç', () => {
    const s = game(['.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 3, y: 0 },
    ]);
    expect(applyMove(s, { penguinId: 'a' })).toEqual(applyMove(s, { penguinId: 'a' }));
  });
});
