/**
 * Elle yazılmış öğretici bölümler. Her kuralın ilk bölümleri elle tasarlanır
 * ki kural kendini açıkça göstersin; gerisi üreticiden gelir.
 *
 *   handmadeA → Dünya 1, bölüm 1–4 (sabit yön)
 *   handmadeB → Dünya 1, bölüm 11–12 ("çarpınca dön")
 *   handmade2A → Macera 2, bölüm 31–32 (çatlak buz)
 *   handmade3A → Macera 3, bölüm 61 (uyuyan penguen)
 *
 * Bölüm numaraları burada değil, kataloğu kuran index.ts'te verilir.
 * `par` ve `solution` çözücüyle doğrulanır (bkz. __tests__/levels.test.ts).
 * Izgara:  .  buz   #  kaya   ~  su   +  çatlak buz
 */
import type { LevelDef } from '@/engine';

export const handmadeA: LevelDef[] = [
  // 1 — Öğretici: tek penguen, dümdüz yuvaya.
  {
    id: '1',
    world: 1,
    grid: [
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
    ],
    penguins: [{ id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 2 }],
    igloos: [{ color: 'blue', x: 4, y: 2 }],
    par: 1,
    solution: ['piti'],
  },

  // 2 — İki penguen, iki yuva: yollar kesişiyor ama kimse kimseyi engellemiyor.
  {
    id: '2',
    world: 1,
    grid: [
      '.....',
      '.....',
      '#....',
      '.....',
      '....#',
      '.....',
    ],
    penguins: [
      { id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 1 },
      { id: 'nar', character: 'nar', color: 'red', dir: 'up', x: 2, y: 5 },
    ],
    igloos: [
      { color: 'blue', x: 4, y: 1 },
      { color: 'red', x: 2, y: 0 },
    ],
    par: 2,
    solution: ['piti', 'nar'],
  },

  // 3 — Sıra önemli: Limon, Pıtı'nın yolunda. Önce Limon çekilmeli.
  {
    id: '3',
    world: 1,
    grid: [
      '.....',
      '..#..',
      '.....',
      '.....',
      '~....',
      '.....',
    ],
    penguins: [
      { id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 2 },
      { id: 'limon', character: 'limon', color: 'yellow', dir: 'down', x: 3, y: 2 },
    ],
    igloos: [
      { color: 'blue', x: 4, y: 2 },
      { color: 'yellow', x: 3, y: 5 },
    ],
    par: 2,
    solution: ['limon', 'piti'],
  },

  // 4 — Zincir: Pıtı'nın yolunda Nar, Nar'ın yolunda Nane, Nane'nin yolunda
  // Limon var. Sondan başa çözülür. Yanlış sırayla dokunmak yalnızca hamle
  // harcatır; kimse kilitlenmez (çıkmaz yok).
  {
    id: '4',
    world: 1,
    grid: [
      '......',
      '......',
      '......',
      '....#.',
      '......',
      '#.....',
    ],
    penguins: [
      { id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 2 },
      { id: 'nar', character: 'nar', color: 'red', dir: 'down', x: 3, y: 2 },
      { id: 'nane', character: 'nane', color: 'green', dir: 'left', x: 3, y: 4 },
      { id: 'limon', character: 'limon', color: 'yellow', dir: 'up', x: 1, y: 4 },
    ],
    igloos: [
      { color: 'blue', x: 5, y: 2 },
      { color: 'red', x: 3, y: 5 },
      { color: 'green', x: 0, y: 4 },
      { color: 'yellow', x: 1, y: 0 },
    ],
    par: 4,
    solution: ['limon', 'nane', 'nar', 'piti'],
  },
];

const TURN = { turnOnBump: true } as const;

export const handmadeB: LevelDef[] = [
  // 11 — Dümdüz yuvaya (kural henüz devreye girmiyor).
  {
    id: 'b1',
    rules: TURN,
    grid: ['.....', '.....', '.....', '.....', '.....'],
    penguins: [{ id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 2 }],
    igloos: [{ color: 'blue', x: 4, y: 2 }],
    par: 1,
    solution: ['piti'],
  },
  // 12 — Köşe: duvara çarpar, aşağı döner; ikinci dokunuşta yuvaya iner.
  {
    id: 'b2',
    rules: TURN,
    grid: ['.....', '.....', '.....', '.....', '.....'],
    penguins: [{ id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 1 }],
    igloos: [{ color: 'blue', x: 4, y: 4 }],
    par: 2,
    solution: ['piti', 'piti'],
  },
];

/** Macera 2, bölüm 31–32 (çatlak buz). */
export const handmade2A: LevelDef[] = [
  // 31 — Öğretici: Pıtı çatlağın üstünden geçer, buz arkasından kırılır.
  {
    id: '31',
    rules: TURN,
    grid: [
      '.....',
      '.....',
      '..+..',
      '.....',
      '.....',
    ],
    penguins: [{ id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 2 }],
    igloos: [{ color: 'blue', x: 4, y: 2 }],
    par: 1,
    solution: ['piti'],
  },

  // 32 — Çatlak bir araçtır: önce Nar geçip buzu kırar, Pıtı suyun önünde durup yuvasına döner.
  {
    id: '32',
    rules: TURN,
    grid: [
      '.....',
      '.....',
      '..+..',
      '.....',
      '.....',
    ],
    penguins: [
      { id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 2 },
      { id: 'nar', character: 'nar', color: 'red', dir: 'up', x: 2, y: 4 },
    ],
    igloos: [
      { color: 'blue', x: 1, y: 4 },
      { color: 'red', x: 2, y: 0 },
    ],
    par: 3,
    solution: ['nar', 'piti', 'piti'],
  },
];

/** Macera 3, bölüm 61 (uyuyan penguen). */
export const handmade3A: LevelDef[] = [
  // 61 — Öğretici: Pıtı uyuyan Nar'a çarpar; Nar uyanır, ikisi de yuvasına gider.
  {
    id: '61',
    rules: TURN,
    grid: [
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
    ],
    penguins: [
      { id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 2 },
      { id: 'nar', character: 'nar', color: 'red', dir: 'down', x: 3, y: 2, asleep: true },
    ],
    igloos: [
      { color: 'blue', x: 2, y: 4 },
      { color: 'red', x: 3, y: 4 },
    ],
    par: 3,
    solution: ['piti', 'nar', 'piti'],
  },
];
