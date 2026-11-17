/** "Çarpınca dön" kuralı: çarpan penguen saat yönünde döner. */
import { applyMove } from '../applyMove';
import { isStuck, legalMoves } from '../rules';
import { deserialize, serialize, stateKey } from '../serialize';
import { game, penguin, play, types } from './helpers';

const TURN = { rules: { turnOnBump: true } };

describe('çarpınca dön', () => {
  it('duvara çarpan penguen saat yönünde döner', () => {
    const s = game(['.....', '.....', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 4, y: 2 },
    ], TURN);
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(penguin(state, 'a')).toMatchObject({ x: 4, y: 0, dir: 'down' });
    expect(types(events)).toEqual(['slide', 'bump', 'turn']);
    expect(events[2]).toEqual({ type: 'turn', penguinId: 'a', from: 'right', to: 'down' });
  });

  it('döndükten sonra yeni yönde kayar: köşeden dönüp yuvaya girer', () => {
    const s = game(['.....', '.....', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 4, y: 2 },
    ], TURN);
    const end = play(s, 'a', 'a');
    expect(end.result).toMatchObject({ winner: 0, reason: 'allHome' });
    expect(end.moveCount).toBe(2);
  });

  it.each([
    ['up', 'right'],
    ['right', 'down'],
    ['down', 'left'],
    ['left', 'up'],
  ] as const)('%s bakan çarpınca %s bakar', (from, to) => {
    const s = game(['...', '...', '...'], [{ id: 'a', color: 'blue', dir: from, x: 1, y: 1 }], [
      { color: 'blue', x: 0, y: 0 },
    ], TURN);
    expect(penguin(play(s, 'a'), 'a').dir).toBe(to);
  });

  it('asıl strateji: park edilmiş penguene çarpıp istenen sütunda durur ve döner', () => {
    // Mavinin yuvası (2,3)'te. Park yokken mavi sağ kenara kadar kayar ve yuvanın
    // sütununu kaçırır. Kırmızı önce (3,1)'e park ederse mavi (2,1)'de durur,
    // aşağı döner ve yuvasına iner.
    const s = game(
      ['...#.', '.....', '.....', '.....'],
      [
        { id: 'blue', color: 'blue', dir: 'right', x: 0, y: 1 },
        { id: 'red', color: 'red', dir: 'up', x: 3, y: 3 },
      ],
      [
        { color: 'blue', x: 2, y: 3 },
        { color: 'red', x: 4, y: 3 },
      ],
      TURN,
    );
    const parked = play(s, 'red');
    expect(penguin(parked, 'red')).toMatchObject({ x: 3, y: 1, dir: 'right' });

    const stopped = play(parked, 'blue');
    expect(penguin(stopped, 'blue')).toMatchObject({ x: 2, y: 1, dir: 'down' });
    expect(penguin(play(stopped, 'blue'), 'blue').status).toBe('home');
  });

  it('igloya giren penguen dönmez', () => {
    const s = game(['....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [{ color: 'blue', x: 3, y: 0 }], TURN);
    expect(types(applyMove(s, { penguinId: 'a' }).events)).toEqual(['slide', 'enterIgloo', 'gameOver']);
  });

  it('önü kapalı penguene dokunmak onu yerinde döndürür ve hamle sayılır', () => {
    const s = game(['.#.', '...'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ], TURN);
    expect(legalMoves(s)).toEqual([{ penguinId: 'a' }]);

    const { state, events, accepted } = applyMove(s, { penguinId: 'a' });
    expect(accepted).toBe(true);
    expect(penguin(state, 'a')).toMatchObject({ x: 0, y: 0, dir: 'down' });
    expect(state.moveCount).toBe(1);
    expect(types(events)).toEqual(['turn']);
    // Şimdi aşağı bakıyor: yuvası tam altında.
    expect(play(state, 'a').result).not.toBeNull();
  });

  it('yerinde dönen penguen uyuyan komşusunu uyandırmaz; kayıp çarpan uyandırır', () => {
    const build = (x: number) =>
      game(
        ['.....', '.....'],
        [
          { id: 'a', color: 'blue', dir: 'right', x, y: 0 },
          { id: 'z', color: 'red', dir: 'down', x: 3, y: 0, asleep: true },
        ],
        [
          { color: 'blue', x: 0, y: 1 },
          { color: 'red', x: 3, y: 1 },
        ],
        TURN,
      );
    expect(penguin(play(build(2), 'a'), 'z').status).toBe('asleep');
    const woke = applyMove(build(0), { penguinId: 'a' });
    expect(penguin(woke.state, 'z').status).toBe('active');
    expect(types(woke.events)).toEqual(['slide', 'bump', 'turn', 'wakeUp']);
  });

  it('hiçbir penguen duvara bakarak sıkışmaz', () => {
    const s = game(['...', '...'], [{ id: 'a', color: 'blue', dir: 'up', x: 0, y: 0 }], [
      { color: 'blue', x: 2, y: 1 },
    ], TURN);
    expect(isStuck(s)).toBe(false);
  });

  it('kural kapalıyken hiçbir şey değişmez', () => {
    const s = game(['.....', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ]);
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(penguin(state, 'a').dir).toBe('right');
    expect(types(events)).toEqual(['slide', 'bump']);
  });
});

describe('çarpınca dön: durum', () => {
  const s = game(['.....', '.....', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
    { color: 'blue', x: 2, y: 2 },
  ], TURN);

  it('yön, durum anahtarının parçasıdır', () => {
    // Köşede yerinde dönmek konumu değiştirmez ama durumu değiştirir;
    // dört kez dönünce başa gelinir.
    const boxed = game(['#.#', '.#.'], [{ id: 'a', color: 'blue', dir: 'up', x: 1, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ], TURN);
    const once = play(boxed, 'a');
    expect(penguin(once, 'a')).toMatchObject({ x: 1, y: 0, dir: 'right' });
    expect(stateKey(once)).not.toBe(stateKey(boxed));
    expect(stateKey(play(boxed, 'a', 'a', 'a', 'a'))).toBe(stateKey(boxed));
  });

  it('serileştirme kuralı ve yönü korur', () => {
    const mid = play(s, 'a');
    const restored = deserialize(serialize(mid));
    expect(restored).toEqual(mid);
    expect(restored.rules.turnOnBump).toBe(true);
  });

  it('kural alanı olmayan eski kayıt, kural kapalı olarak okunur', () => {
    const data = JSON.parse(serialize(s));
    data.r = data.r.slice(0, 3);
    expect(deserialize(JSON.stringify(data)).rules.turnOnBump).toBe(false);
  });
});
