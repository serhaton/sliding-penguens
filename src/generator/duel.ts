/**
 * Düello tahtası üreticisi: 180° döndürmeye göre simetrik tahtalar.
 *
 * Simetri adaleti sağlar: tahtayı 180° çevirince iki takım yer değiştirir, yani
 * iki oyuncu birebir aynı durumu görür. Geriye yalnızca "kim önce oynuyor"
 * avantajı kalır; onu simülasyon ölçer (bkz. ai/simulate.ts).
 *
 * Yerleşim: takım 0'ın penguenleri alt yarıda başlar, iglooları üst yarıdadır;
 * takım 1 bunun ayna görüntüsüdür. İki takım yuvaya gitmek için birbirinin
 * içinden geçmek zorundadır.
 */
import { createGame, DIR_VECTORS, DIRECTIONS, type Direction, type LevelDef, type PenguinColor, type TeamId } from '@/engine';
import { solve } from '@/solver';

import type { Rng } from './rng';

export interface DuelGenParams {
  width: number;
  height: number;
  /** Takım başına penguen (ve igloo) sayısı. */
  penguins: number;
  /** Simetrik kaya çifti sayısı. */
  rockPairs: number;
  /** Simetrik su çifti sayısı. */
  waterPairs: number;
  /**
   * Bir penguenin, tek başına yuvasına varması için gereken en fazla dokunuş
   * (varsayılan 3). Büyüdükçe maçlar uzar ve hamle sınırına takılır.
   */
  maxTaps?: number;
}

/** Takım renkleri: 0 → mavi, 1 → turuncu (data/duel/index.ts ile aynı olmalı; test denetler). */
export const DUEL_TEAM_COLORS: readonly [PenguinColor, PenguinColor] = ['blue', 'orange'];

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Bir hücrenin 180° döndürülmüş karşılığı. */
export function rotate180(x: number, y: number, width: number, height: number): { x: number; y: number } {
  return { x: width - 1 - x, y: height - 1 - y };
}

/** Yerleştirme başarısız olursa null döner; çağıran yeniden dener. */
export function generateDuelBoard(rng: Rng, params: DuelGenParams, id = 'duel'): LevelDef | null {
  const { width, height } = params;
  const grid: string[][] = Array.from({ length: height }, () => Array<string>(width).fill('.'));
  const taken = new Set<number>();
  const key = (x: number, y: number) => y * width + x;
  const mirror = (x: number, y: number) => rotate180(x, y, width, height);

  /** Hücreyi ve ayna görüntüsünü birlikte ayırır; biri doluysa ya da hücre kendi aynasıysa false. */
  const claimPair = (x: number, y: number): boolean => {
    const m = mirror(x, y);
    if (m.x === x && m.y === y) return false;
    if (taken.has(key(x, y)) || taken.has(key(m.x, m.y))) return false;
    taken.add(key(x, y));
    taken.add(key(m.x, m.y));
    return true;
  };

  // --- Engeller: çiftler hâlinde, simetrik ---
  for (const [count, ch] of [[params.rockPairs, '#'], [params.waterPairs, '~']] as const) {
    for (let i = 0; i < count; i++) {
      const x = rng.int(0, width - 1);
      const y = rng.int(0, height - 1);
      if (!claimPair(x, y)) continue;
      const m = mirror(x, y);
      grid[y]![x] = ch;
      grid[m.y]![m.x] = ch;
    }
  }

  // Takım 0: igloolar üst yarıda, penguenler alt yarıda. Tek sayılı yükseklikte
  // orta satır kimseye ait değildir.
  const half = Math.floor(height / 2);
  const pickCell = (rowFrom: number, rowTo: number): { x: number; y: number } | null => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = rng.int(0, width - 1);
      const y = rng.int(rowFrom, rowTo);
      if (claimPair(x, y)) return { x, y };
    }
    return null;
  };

  const penguins: LevelDef['penguins'] = [];
  const igloos: LevelDef['igloos'] = [];
  const [colorA, colorB] = DUEL_TEAM_COLORS;

  /**
   * Sabit engel mi? (kenar, kaya, su ya da igloo) Penguenler sayılmaz: onlar
   * maç boyunca yer değiştirir, yolu kalıcı olarak kapatmazlar.
   */
  const iglooCells = new Set<number>();
  const blocked = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height || grid[y]![x] !== '.' || iglooCells.has(key(x, y));

  /**
   * Penguenin tek başına izleyeceği yol ("çarpınca dön" kuralıyla): her kaymada
   * ilk kez geçtiği hücreler. `visits[k]`, (k+1). dokunuşta geçilen hücrelerdir.
   */
  const soloRoute = (startX: number, startY: number, startDir: Direction, slides: number) => {
    const visits: { x: number; y: number }[][] = [];
    const seen = new Set<number>([key(startX, startY)]);
    let x = startX;
    let y = startY;
    let d = DIRECTIONS.indexOf(startDir);
    for (let k = 0; k < slides; k++) {
      const step = DIR_VECTORS[DIRECTIONS[d]!];
      const cells: { x: number; y: number }[] = [];
      while (!blocked(x + step.x, y + step.y)) {
        x += step.x;
        y += step.y;
        if (!seen.has(key(x, y))) {
          seen.add(key(x, y));
          cells.push({ x, y });
        }
      }
      visits.push(cells);
      d = (d + 1) % 4;
    }
    return visits;
  };

  for (let i = 0; i < params.penguins; i++) {
    const start = pickCell(height - half, height - 1);
    if (!start) return null;
    const dir = rng.pick(DIRECTIONS);

    // Igloo, penguenin kendi yolunun üstüne konur: tek başına birkaç dokunuşta
    // varabileceği, tahtanın karşı yarısındaki bir hücre. Böylece her penguenin
    // yuvası ulaşılabilirdir; işi zorlaştıran, yolların birbirini kesmesidir.
    const route = soloRoute(start.x, start.y, dir, params.maxTaps ?? 3);
    const options = route
      .slice(1)
      .flat()
      .filter((c) => c.y < half && !taken.has(key(c.x, c.y)));
    let home: { x: number; y: number } | null = null;
    for (const option of rng.shuffle(options)) {
      if (claimPair(option.x, option.y)) {
        home = option;
        break;
      }
    }
    if (!home) return null;

    const homeB = mirror(home.x, home.y);
    iglooCells.add(key(home.x, home.y));
    iglooCells.add(key(homeB.x, homeB.y));
    const startB = mirror(start.x, start.y);

    igloos.push({ id: `ga${i + 1}`, x: home.x, y: home.y, team: 0 });
    igloos.push({ id: `gb${i + 1}`, x: homeB.x, y: homeB.y, team: 1 });
    penguins.push({ id: `a${i + 1}`, color: colorA, team: 0, dir, x: start.x, y: start.y });
    penguins.push({ id: `b${i + 1}`, color: colorB, team: 1, dir: OPPOSITE[dir], x: startB.x, y: startB.y });
  }

  return {
    id,
    mode: 'duel',
    grid: grid.map((row) => row.join('')),
    penguins,
    igloos,
  };
}

/** Tahta 180° döndürmeye göre simetrik mi? (Testler ve doğrulama için.) */
export function isRotationSymmetric(board: LevelDef): boolean {
  const height = board.grid.length;
  const width = board.grid[0]?.length ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const m = rotate180(x, y, width, height);
      if (board.grid[y]![x] !== board.grid[m.y]![m.x]) return false;
    }
  }
  const teamA = board.penguins.filter((p) => (p.team ?? 0) === 0);
  const teamB = board.penguins.filter((p) => p.team === 1);
  if (teamA.length !== teamB.length) return false;
  const penguinsMatch = teamA.every((p) => {
    const m = rotate180(p.x, p.y, width, height);
    return teamB.some((q) => q.x === m.x && q.y === m.y && q.dir === OPPOSITE[p.dir]);
  });
  const homesA = board.igloos.filter((g) => g.team === 0);
  const homesB = board.igloos.filter((g) => g.team === 1);
  const igloosMatch =
    homesA.length === homesB.length &&
    homesA.every((g) => {
      const m = rotate180(g.x, g.y, width, height);
      return homesB.some((h) => h.x === m.x && h.y === m.y);
    });
  return penguinsMatch && igloosMatch;
}

/**
 * Bir takım, rakip hiç yokmuş gibi, bütün penguenlerini en az kaç hamlede
 * yuvaya sokar? Tahtanın "uzunluğunu" ölçer: çok küçükse maç birkaç hamlede
 * biter, çok büyükse hamle sınırına takılır. Çözüm yoksa (ya da arama sınırı
 * aşılırsa) null.
 */
export function soloPar(board: LevelDef, team: TeamId, maxStates = 20_000): number | null {
  const game = createGame(board);
  const alone = {
    ...game,
    penguins: game.penguins.filter((p) => p.team === team),
    teams: [team],
    turn: team,
    rules: { ...game.rules, moveLimit: null },
  };
  const result = solve(alone, { maxStates });
  return result.status === 'solved' ? result.par : null;
}

/**
 * Bir tahtanın oyuna alınması için ölçütler. Zor'a karşı Zor maçlarla ölçülür
 * (bkz. scripts/generate-duel.ts ve ai/simulate.ts).
 */
export const DUEL_CRITERIA = {
  /** Maç başında rastgele oynanan hamle sayısı: farklı açılışlar denensin. */
  randomOpening: 2,
  /** Kaba eleme ve doğrulama için oynatılan maç sayıları. */
  screenGames: 12,
  verifyGames: 80,
  /** Hamle sınırına takılan maçların en yüksek oranı (kilitlenen tahtalar düşer). */
  maxLimitRate: 0.3,
  /** Sonuçlanan maçlarda ilk oynayanın kazanma payı bu aralıkta olmalı. */
  firstWinShare: [0.38, 0.62],
  /** Ortalama maç uzunluğu (toplam hamle). */
  averageMoves: [12, 25],
  /** En kısa maç: ilk birkaç hamlede biten maç olmamalı. */
  shortestGame: 8,
} as const;

/** Simülasyon sonucu ölçütleri geçiyor mu? Kaba elemede sınırlar biraz gevşektir. */
export function passesDuelCriteria(
  stats: {
    limitRate: number;
    firstWinShare: number;
    averageMoves: number;
    shortestGame: number;
  },
  stage: 'screen' | 'verify',
): boolean {
  const slack = stage === 'screen' ? 0.1 : 0;
  const [shareMin, shareMax] = DUEL_CRITERIA.firstWinShare;
  const [movesMin, movesMax] = DUEL_CRITERIA.averageMoves;
  return (
    stats.limitRate <= DUEL_CRITERIA.maxLimitRate + slack &&
    stats.firstWinShare >= shareMin - slack &&
    stats.firstWinShare <= shareMax + slack &&
    stats.averageMoves >= movesMin - slack * 20 &&
    stats.averageMoves <= movesMax + slack * 20 &&
    stats.shortestGame >= DUEL_CRITERIA.shortestGame - (stage === 'screen' ? 2 : 0)
  );
}

/** Tahtanın düzenini özetleyen anahtar: birebir aynı iki tahta seçilmesin. */
export function duelLayoutKey(board: LevelDef): string {
  const cells = (items: readonly { x: number; y: number }[]) =>
    items
      .map((item) => `${item.x},${item.y}`)
      .sort()
      .join(';');
  return [
    board.grid.join('/'),
    cells(board.penguins.filter((p) => (p.team ?? 0) === 0)),
    cells(board.igloos.filter((g) => g.team === 0)),
  ].join('|');
}
