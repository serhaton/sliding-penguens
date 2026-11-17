import { duelBoards } from '@/data/duel';
import { applyMove, createGame, legalMoves, type GameState, type IglooDef, type LevelDef, type PenguinDef } from '@/engine';
import { createRng } from '@/generator/rng';

import { chooseMove, evaluate, FAR, relaxedDistance, scoreMoves, soloDistance, WIN, isWinningValue } from '../index';
import { playGame, simulateBoard } from '../simulate';

function duel(grid: string[], penguins: PenguinDef[], igloos: IglooDef[], rules: LevelDef['rules'] = {}): GameState {
  return createGame({ id: 'test', mode: 'duel', grid, penguins, igloos, rules });
}
const penguin = (state: GameState, id: string) => state.penguins.find((p) => p.id === id)!;

describe('uzaklık tahmini', () => {
  it('sabit yön: yuva yolun üstündeyse 1, değilse uzak', () => {
    const s = duel(
      ['.....', '.....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'c', color: 'blue', team: 0, dir: 'left', x: 2, y: 1 },
        { id: 'b', color: 'orange', team: 1, dir: 'left', x: 4, y: 1 },
      ],
      [
        { team: 0, x: 3, y: 0, capacity: 2 },
        { team: 1, x: 0, y: 1 },
      ],
      { turnOnBump: false },
    );
    expect(soloDistance(s, penguin(s, 'a'))).toBe(1);
    // c sola kayar, rakibin igloosuna çarpar: kendi yuvasına varamaz.
    expect(soloDistance(s, penguin(s, 'c'))).toBe(FAR);
  });

  it('çarpınca dön: duvara çarpıp dönerek iki dokunuşta varır', () => {
    // a yukarı kayar, duvarda sağa döner, ikinci dokunuşta yuvaya girer.
    const s = duel(
      ['...', '...', '...'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'up', x: 0, y: 2 },
        { id: 'b', color: 'orange', team: 1, dir: 'down', x: 2, y: 1 },
      ],
      [
        { team: 0, x: 2, y: 0 },
        { team: 1, x: 1, y: 2 },
      ],
    );
    expect(relaxedDistance(s, penguin(s, 'a'))).toBe(2);
  });

  it('yolun ortasında durmak için takım arkadaşı gerekir; son penguen park edemez', () => {
    // Yuva tahtanın ortasında. a duvar diplerinde dolaşır ve ortaya hiç uğramaz;
    // girmek için yuvanın hizasında, yolun ortasında durması gerekir. Bu ancak
    // bir arkadaşı önüne park ederse olur.
    const grid = ['.....', '.....', '.....', '.....', '.....'];
    const igloos: IglooDef[] = [
      { team: 0, x: 2, y: 2, capacity: 2 },
      { team: 1, x: 3, y: 1 },
    ];
    const a: PenguinDef = { id: 'a', color: 'blue', team: 0, dir: 'up', x: 0, y: 4 };
    const b: PenguinDef = { id: 'b', color: 'orange', team: 1, dir: 'left', x: 1, y: 3 };

    const withFriend = duel(grid, [a, { id: 'c', color: 'blue', team: 0, dir: 'up', x: 3, y: 3 }, b], igloos);
    // Yukarı kayarken yuvanın hizasında dur (1 + park bedeli 1), sağa dönüp gir (1) = 3.
    expect(relaxedDistance(withFriend, penguin(withFriend, 'a'))).toBe(3);

    // Tek başına: yalnızca doğal engellerde durur, ortadaki yuvaya varamaz.
    const alone = duel(grid, [a, b], igloos);
    expect(relaxedDistance(alone, penguin(alone, 'a'))).toBe(FAR);
  });

  it('simetrik tahtada başlangıç puanı iki takım için de sıfırdır', () => {
    for (const board of duelBoards.slice(0, 5)) {
      const s = createGame(board);
      expect(evaluate(s, 0)).toBe(0);
      expect(evaluate(s, 1)).toBe(0);
    }
  });
});

describe('hamle seçimi', () => {
  it('orta: hemen yuvaya giren hamleyi seçer', () => {
    // a tek dokunuşla yuvaya girer; d ise önü kapalı, yalnızca yerinde döner.
    // (d sonradan tek başına da yuvasına varabilir, yani a'nın girmesi onu
    // çaresiz bırakmaz; bırakacak olsaydı yapay zekâ a'yı bekletirdi.)
    const s = duel(
      ['....', '....', '....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'd', color: 'blue', team: 0, dir: 'left', x: 0, y: 1 },
        { id: 'b', color: 'orange', team: 1, dir: 'up', x: 3, y: 1 },
      ],
      [
        { team: 0, x: 3, y: 0 },
        { team: 0, x: 2, y: 2 },
        { team: 1, x: 1, y: 1 },
      ],
    );
    const rng = createRng(1);
    for (let i = 0; i < 10; i++) expect(chooseMove(s, 'medium', rng)).toEqual({ penguinId: 'a' });
  });

  it('zor: tek hamlede kazanıyorsa kazanır ve bunu kesin galibiyet olarak puanlar', () => {
    // Önce c yuvaya girer, turuncu bir hamle yapar; mavinin tahtada yalnızca a'sı
    // kalır ve yuvası tam önündedir.
    const start = duel(
      ['....', '....', '....'],
      [
        { id: 'a', color: 'blue', team: 0, dir: 'right', x: 0, y: 0 },
        { id: 'c', color: 'blue', team: 0, dir: 'right', x: 0, y: 2 },
        { id: 'b', color: 'orange', team: 1, dir: 'down', x: 2, y: 1 },
      ],
      [
        { team: 0, x: 3, y: 0 },
        { team: 0, x: 3, y: 2 },
        { team: 1, x: 3, y: 1 },
      ],
    );
    // Mavi c yuvaya girer, turuncu b bir hamle yapar; sıra yine mavide ve a kaldı.
    const s = applyMove(applyMove(start, { penguinId: 'c' }).state, { penguinId: 'b' }).state;
    expect(s.turn).toBe(0);

    const scored = scoreMoves(s, 4);
    expect(scored).toHaveLength(1);
    expect(scored[0]!.move.penguinId).toBe('a');
    expect(isWinningValue(scored[0]!.value)).toBe(true);
    expect(chooseMove(s, 'hard', createRng(1))).toEqual({ penguinId: 'a' });

    const won = applyMove(s, { penguinId: 'a' }).state;
    expect(evaluate(won, 0)).toBe(WIN);
    expect(evaluate(won, 1)).toBe(-WIN);
  });

  it('her zorluk yalnızca geçerli hamle oynar; oyun bitince hamle yoktur', () => {
    const rng = createRng(3);
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      let s = createGame(duelBoards[0]!);
      while (!s.result) {
        const move = chooseMove(s, difficulty, rng)!;
        expect(legalMoves(s)).toContainEqual(move);
        s = applyMove(s, move).state;
      }
      expect(chooseMove(s, difficulty, rng)).toBeNull();
    }
  });

  it('aynı tohum aynı maçı üretir', () => {
    const board = duelBoards[1]!;
    const play = () => playGame(board, createRng(42), { players: ['hard', 'easy'], randomOpening: 2 });
    expect(play()).toEqual(play());
  });
});

describe('zorluk sıralaması', () => {
  /**
   * Güçlü taraf iki rolde de (ilk ve ikinci oynayan) oynatılır; toplam
   * galibiyetler sayılır. Açılışlar rastgeledir: yoksa aynı maç tekrar tekrar
   * oynanır ve sonuç tek bir maçın şansına kalır. Tohum sabit: test kararlıdır.
   */
  function duelRecord(strong: 'medium' | 'hard', weak: 'easy' | 'medium') {
    const rng = createRng(7);
    let strongWins = 0;
    let weakWins = 0;
    for (const board of duelBoards) {
      const asFirst = simulateBoard(board, rng, 2, { players: [strong, weak], randomOpening: 2 });
      const asSecond = simulateBoard(board, rng, 2, { players: [weak, strong], randomOpening: 2 });
      strongWins += asFirst.firstWins + asSecond.secondWins;
      weakWins += asFirst.secondWins + asSecond.firstWins;
    }
    return { strongWins, weakWins };
  }

  it('orta, kolayı yener', () => {
    const { strongWins, weakWins } = duelRecord('medium', 'easy');
    expect(strongWins).toBeGreaterThan(weakWins);
  });

  it('zor, ortayı yener', () => {
    const { strongWins, weakWins } = duelRecord('hard', 'medium');
    expect(strongWins).toBeGreaterThan(weakWins);
  });

  it('zor, kolayı açık farkla yener', () => {
    const { strongWins, weakWins } = duelRecord('hard', 'easy');
    expect(strongWins).toBeGreaterThan(weakWins * 1.5);
  });
});
