/** Geri alma, serileştirme, tekrar oynatma ve bölüm doğrulama. */
import { applyMove, replay } from '../applyMove';
import { canUndo, createHistory, currentState, playMove, restart, undo } from '../history';
import { createGame, LevelError, type LevelDef } from '../level';
import { deserialize, serialize, stateKey } from '../serialize';
import { game, level, play } from './helpers';

/** Bütün mekanikleri içeren küçük bir bölüm. */
const rich = () =>
  game(
    ['.+...', '..#..', '....~'],
    [
      { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
      { id: 'b', color: 'red', dir: 'up', x: 3, y: 2 },
      { id: 'z', color: 'green', dir: 'left', x: 4, y: 0, asleep: true },
    ],
    [
      { color: 'blue', x: 0, y: 2 },
      { color: 'red', x: 3, y: 0 },
      { color: 'green', x: 0, y: 1 },
    ],
  );

describe('geri al', () => {
  it('son hamleyi geri alır; çatlak buz ve uyanma da geri döner', () => {
    const initial = rich();
    let h = createHistory(initial);
    expect(canUndo(h)).toBe(false);

    // a sağa kayar: (1,0) çatlağını kırar, kırmızı igloonun (3,0) önünde durur.
    h = playMove(h, { penguinId: 'a' }).history;
    expect(currentState(h).cells).not.toEqual(initial.cells);
    expect(h.moves).toEqual([{ penguinId: 'a' }]);

    h = undo(h);
    expect(currentState(h)).toBe(initial);
    expect(h.moves).toEqual([]);
  });

  it('birden fazla adım geri alınabilir, başlangıçta durur', () => {
    let h = createHistory(rich());
    h = playMove(h, { penguinId: 'a' }).history;
    h = playMove(h, { penguinId: 'b' }).history;
    expect(h.states).toHaveLength(3);

    h = undo(undo(undo(undo(h))));
    expect(h.states).toHaveLength(1);
    expect(currentState(h).moveCount).toBe(0);
  });

  it('reddedilen hamle geçmişe yazılmaz', () => {
    const h = createHistory(rich());
    const outcome = playMove(h, { penguinId: 'z' });
    expect(outcome.accepted).toBe(false);
    expect(outcome.history).toBe(h);
  });

  it('baştan başla yalnızca başlangıç durumunu bırakır', () => {
    const initial = rich();
    let h = createHistory(initial);
    h = playMove(h, { penguinId: 'a' }).history;
    h = restart(h);
    expect(h.states).toEqual([initial]);
    expect(h.moves).toEqual([]);
  });
});

describe('serileştirme', () => {
  it('başlangıç durumu gidip gelince aynı kalır', () => {
    const s = rich();
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('oyun ortası ve bitmiş durum gidip gelince aynı kalır', () => {
    const mid = play(rich(), 'a');
    expect(deserialize(serialize(mid))).toEqual(mid);

    const duel = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'orange', team: 1, dir: 'left', x: 4, y: 1 },
      ],
      [
        { team: 0, x: 3, y: 0 },
        { team: 1, x: 1, y: 1 },
      ],
      { mode: 'duel', rules: { secondPlayerExtraMove: true } },
    );
    const done = play(duel, 'a');
    expect(done.result).not.toBeNull();
    expect(deserialize(serialize(done))).toEqual(done);
  });

  it('geri okunan durumdan oyun aynı şekilde devam eder', () => {
    const mid = play(rich(), 'a');
    const restored = deserialize(serialize(mid));
    expect(applyMove(restored, { penguinId: 'b' })).toEqual(applyMove(mid, { penguinId: 'b' }));
  });

  it('kompakt: küçük bir tahta 400 karakteri geçmez', () => {
    expect(serialize(rich()).length).toBeLessThan(400);
  });

  it('bilinmeyen sürümü ve bozuk veriyi reddeder', () => {
    const data = JSON.parse(serialize(rich()));
    expect(() => deserialize(JSON.stringify({ ...data, v: 99 }))).toThrow(/sürüm/);
    expect(() => deserialize(JSON.stringify({ ...data, c: '...' }))).toThrow(/bozuk/);
    expect(() => deserialize('not json')).toThrow();
  });
});

describe('durum anahtarı', () => {
  it('aynı konuma farklı sırayla varılınca anahtar aynıdır', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'red', dir: 'right', x: 0, y: 1 },
      ],
      [
        { color: 'blue', x: 2, y: 1 },
        { color: 'red', x: 2, y: 0 },
      ],
    );
    expect(stateKey(play(s, 'a', 'b'))).toBe(stateKey(play(s, 'b', 'a')));
    expect(stateKey(play(s, 'a'))).not.toBe(stateKey(s));
  });

  it('kırılan buz ve uyanan penguen anahtarı değiştirir', () => {
    const s = rich();
    const after = play(s, 'a');
    expect(stateKey(after)).not.toBe(stateKey(s));
  });
});

describe('tekrar oynatma', () => {
  it('aynı başlangıç + aynı hamle listesi aynı sonu verir', () => {
    const moves = [{ penguinId: 'a' }, { penguinId: 'b' }];
    const first = replay(rich(), moves);
    const second = replay(rich(), moves);
    expect(first.state).toEqual(second.state);
    expect(first.events).toEqual(second.events);
    expect(first.events).toHaveLength(2);
    expect(first.state).toEqual(play(rich(), 'a', 'b'));
  });

  it('bozuk kayıtta hata fırlatır', () => {
    expect(() => replay(rich(), [{ penguinId: 'z' }])).toThrow(/Kayıt bozuk/);
  });
});

describe('bölüm doğrulama', () => {
  const base = (): LevelDef =>
    level(['....', '....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 3, y: 1 },
    ]);
  const broken = (change: (def: LevelDef) => void) => {
    const def = base();
    change(def);
    return () => createGame(def);
  };

  it('geçerli bölümü kabul eder ve varsayılanları doldurur', () => {
    const s = createGame(base());
    expect(s).toMatchObject({ width: 4, height: 2, teams: [0], turn: 0, moveCount: 0, result: null });
    expect(s.rules).toEqual({ iglooMatch: 'color', moveLimit: null, secondPlayerExtraMove: false, turnOnBump: false });
    expect(s.igloos[0]).toMatchObject({ id: 'g0', capacity: null, occupants: 0 });
  });

  it('düello varsayılanları: takım eşleşmesi, 30 hamle, çarpınca dön, igloo başına tek penguen', () => {
    const s = game(
      ['...', '...'],
      [
        { color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { color: 'orange', team: 1, dir: 'left', x: 2, y: 1 },
      ],
      [
        { team: 0, x: 2, y: 0 },
        { team: 1, x: 0, y: 1 },
      ],
      { mode: 'duel' },
    );
    expect(s.rules).toEqual({ iglooMatch: 'team', moveLimit: 30, secondPlayerExtraMove: false, turnOnBump: true });
    expect(s.igloos.map((g) => g.capacity)).toEqual([1, 1]);
    expect(s.penguins.map((p) => p.id)).toEqual(['p0', 'p1']);
  });

  it.each([
    ['eşit olmayan satırlar', (d: LevelDef) => void (d.grid = ['....', '...'])],
    ['bilinmeyen hücre karakteri', (d: LevelDef) => void (d.grid = ['..?.', '....'])],
    ['boş ızgara', (d: LevelDef) => void (d.grid = [])],
    ['tahta dışında penguen', (d: LevelDef) => void (d.penguins[0]!.x = 9)],
    ['kaya üstünde penguen', (d: LevelDef) => void (d.grid = ['#...', '....'])],
    ['su üstünde igloo', (d: LevelDef) => void (d.grid = ['....', '...~'])],
    ['aynı hücrede iki nesne', (d: LevelDef) => void (d.igloos[0] = { color: 'blue', x: 0, y: 0 })],
    ['yinelenen kimlik', (d: LevelDef) => void d.penguins.push({ id: 'a', color: 'blue', dir: 'left', x: 2, y: 0 })],
    ['igloosu olmayan renk', (d: LevelDef) => void (d.igloos[0]!.color = 'red')],
    ['rengi olmayan igloo', (d: LevelDef) => void delete d.igloos[0]!.color],
    ['hiç penguen yok', (d: LevelDef) => void (d.penguins = [])],
    ['tek oyunculuda iki takım', (d: LevelDef) => void d.penguins.push({ color: 'blue', team: 1, dir: 'left', x: 2, y: 0 })],
    ['tek takımlı düello', (d: LevelDef) => void (d.mode = 'duel')],
  ])('reddeder: %s', (_name, change) => {
    expect(broken(change)).toThrow(LevelError);
  });

  it('düelloda takım başına yeterli igloo ister', () => {
    expect(() =>
      game(
        ['...', '...'],
        [
          { color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
          { color: 'blue', team: 0, dir: 'right', x: 1, y: 0 },
          { color: 'orange', team: 1, dir: 'left', x: 2, y: 1 },
        ],
        [
          { team: 0, x: 2, y: 0 },
          { team: 1, x: 0, y: 1 },
        ],
        { mode: 'duel' },
      ),
    ).toThrow(/yeterli igloo/);
  });
});
