/** Dünya 2 ve 3 mekanikleri: çatlak buz ve uyuyan penguen. */
import { applyMove } from '../applyMove';
import { cellAt } from '../grid';
import { legalMoves } from '../rules';
import { game, penguin, play, types } from './helpers';

describe('çatlak buz', () => {
  it('üstünden geçilince suya döner', () => {
    const s = game(['..+..', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ]);
    const { state, events } = applyMove(s, { penguinId: 'a' });

    expect(penguin(state, 'a')).toMatchObject({ x: 4, y: 0 });
    expect(cellAt(state, 2, 0)).toBe('water');
    // step 2: başlangıç 0, (1,0) 1, (2,0) 2.
    expect(events).toContainEqual({ type: 'crackBreak', x: 2, y: 0, step: 2 });
    expect(types(events)).toEqual(['slide', 'crackBreak', 'bump']);
  });

  it('kırıldıktan sonra engel olur', () => {
    const s = game(
      ['..+..', '.....'],
      [
        { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
        { id: 'b', color: 'blue', dir: 'right', x: 1, y: 0 },
      ],
      [{ color: 'blue', x: 0, y: 1 }],
    );
    const after = play(s, 'b', 'a');
    expect(penguin(after, 'b')).toMatchObject({ x: 4, y: 0 });
    // a, artık su olan (2,0)'ın önünde, (1,0)'da durur.
    expect(penguin(after, 'a')).toMatchObject({ x: 1, y: 0 });
  });

  it('üstünde duran penguenin altında kırılmaz; ayrılınca kırılır', () => {
    const s = game(
      ['..+#.', '.....'],
      [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }],
      [{ color: 'blue', x: 0, y: 1 }],
    );
    const rested = play(s, 'a');
    expect(penguin(rested, 'a')).toMatchObject({ x: 2, y: 0 });
    expect(cellAt(rested, 2, 0)).toBe('cracked');
  });

  it('çatlak buzda başlayan penguen ayrılınca başlangıç hücresi kırılır', () => {
    const s = game(['+....', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ]);
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(cellAt(state, 0, 0)).toBe('water');
    expect(events).toContainEqual({ type: 'crackBreak', x: 0, y: 0, step: 0 });
  });

  it('art arda birkaç çatlak hücre aynı kaymada kırılır', () => {
    const s = game(['.++..', '.....'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 0, y: 1 },
    ]);
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(cellAt(state, 1, 0)).toBe('water');
    expect(cellAt(state, 2, 0)).toBe('water');
    expect(events.filter((e) => e.type === 'crackBreak')).toHaveLength(2);
  });

  it('igloya girerken geçilen çatlak hücre de kırılır', () => {
    const s = game(['.+..'], [{ id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 }], [
      { color: 'blue', x: 2, y: 0 },
    ]);
    const { state, events } = applyMove(s, { penguinId: 'a' });
    expect(cellAt(state, 1, 0)).toBe('water');
    expect(types(events)).toEqual(['slide', 'crackBreak', 'enterIgloo', 'gameOver']);
  });
});

describe('uyuyan penguen', () => {
  const build = () =>
    game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', dir: 'right', x: 0, y: 0 },
        { id: 'z', color: 'red', dir: 'down', x: 3, y: 0, asleep: true },
      ],
      [
        { color: 'blue', x: 0, y: 1 },
        { color: 'red', x: 3, y: 1 },
      ],
    );

  it('uyurken oynanamaz', () => {
    const s = build();
    expect(applyMove(s, { penguinId: 'z' }).events[0]).toMatchObject({ reason: 'notActive' });
    expect(legalMoves(s)).toEqual([{ penguinId: 'a' }]);
  });

  it('engel gibi davranır ve çarpılınca uyanır', () => {
    const { state, events } = applyMove(build(), { penguinId: 'a' });
    expect(penguin(state, 'a')).toMatchObject({ x: 2, y: 0 });
    expect(penguin(state, 'z').status).toBe('active');
    expect(types(events)).toEqual(['slide', 'bump', 'wakeUp']);
    expect(events[2]).toEqual({ type: 'wakeUp', penguinId: 'z', byPenguinId: 'a' });
  });

  it('uyandıktan sonra oynanır ve yuvasına girebilir', () => {
    const after = play(build(), 'a', 'z');
    expect(penguin(after, 'z').status).toBe('home');
  });

  it('bitişikteki penguenin reddedilen dokunuşu uyandırmaz', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', dir: 'right', x: 2, y: 0 },
        { id: 'z', color: 'red', dir: 'down', x: 3, y: 0, asleep: true },
      ],
      [
        { color: 'blue', x: 0, y: 1 },
        { color: 'red', x: 3, y: 1 },
      ],
    );
    const { state, accepted } = applyMove(s, { penguinId: 'a' });
    expect(accepted).toBe(false);
    expect(penguin(state, 'z').status).toBe('asleep');
  });

  it('uyuyan penguen yuvaya girmeden bölüm bitmez', () => {
    const s = game(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', dir: 'down', x: 0, y: 0 },
        { id: 'z', color: 'red', dir: 'down', x: 3, y: 0, asleep: true },
      ],
      [
        { color: 'blue', x: 0, y: 1 },
        { color: 'red', x: 3, y: 1 },
      ],
    );
    expect(play(s, 'a').result).toBeNull();
  });
});
