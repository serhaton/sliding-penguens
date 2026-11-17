/**
 * Rastgele aday bölüm üretir. Burada zekâ yok: aday geçerli bir tahta olur ama
 * çözülebilir ya da ilginç olması garanti değildir. Onu `measure` ölçer ve
 * `selectLevels` seçer (üret → ölç → ele).
 */
import { characterForColor } from '@/data/characters';
import { DIRECTIONS, DIR_VECTORS, type Direction, type LevelDef, type PenguinColor } from '@/engine';

import type { Rng } from './rng';

export interface GenParams {
  width: number;
  height: number;
  /** Farklı renkteki penguen sayısı. */
  penguins: number;
  /** Bunlara ek olarak, bir rengi paylaşan ikinci penguen sayısı (aynı igloya girer). */
  twins?: number;
  rocks: number;
  water: number;
  /**
   * 0–1: yeni penguenin, daha önce yerleşmiş birinin yuva yoluna konma olasılığı.
   * Yüksekse penguenler birbirinin önünü daha çok keser (daha çok sıralama işi).
   */
  blockBias?: number;
  /**
   * "Çarpınca dön" bölümleri için: igloo penguenin yoluna değil, tahtada
   * herhangi bir boş hücreye konur (penguen oraya dönerek ulaşır).
   */
  freeIgloos?: boolean;
  /** Adaya yazılacak kural ayarları (ör. { turnOnBump: true }). */
  rules?: LevelDef['rules'];
  /** Çatlak buz hücresi sayısı (penguen ve igloo olmayan boş buzlara konur). */
  cracked?: number;
  /** Uyuyarak başlayan penguen sayısı (en az bir penguen uyanık kalır). */
  sleepers?: number;
}

const COLORS: readonly PenguinColor[] = ['blue', 'red', 'yellow', 'green', 'orange', 'purple'];

/** Bir denemede yerleştirme başarısız olursa null döner; çağıran yeniden dener. */
export function generateCandidate(rng: Rng, params: GenParams): LevelDef | null {
  const { width, height } = params;
  const grid: string[][] = Array.from({ length: height }, () => Array<string>(width).fill('.'));
  const taken = new Set<number>();
  const key = (x: number, y: number) => y * width + x;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  const isIce = (x: number, y: number) => inside(x, y) && grid[y]![x] === '.';
  const free = (x: number, y: number) => isIce(x, y) && !taken.has(key(x, y));

  // Kaya ve su: kenarlara yapışık engeller çoğu zaman süs olur, o yüzden her yere serbest.
  for (const [count, ch] of [[params.rocks, '#'], [params.water, '~']] as const) {
    for (let i = 0; i < count; i++) {
      const x = rng.int(0, width - 1);
      const y = rng.int(0, height - 1);
      if (grid[y]![x] === '.') grid[y]![x] = ch;
    }
  }

  const penguins: LevelDef['penguins'] = [];
  const igloos: LevelDef['igloos'] = [];
  const colors = rng.shuffle(COLORS).slice(0, params.penguins);
  if (colors.length < params.penguins) return null;

  /** (x,y)'den `dir` yönünde, sabit engele (kenar, kaya, su) kadar olan hücreler. */
  const ray = (x: number, y: number, dir: Direction) => {
    const v = DIR_VECTORS[dir];
    const cells: { x: number; y: number }[] = [];
    for (let cx = x + v.x, cy = y + v.y; isIce(cx, cy); cx += v.x, cy += v.y) cells.push({ x: cx, y: cy });
    return cells;
  };

  /** Yerleşmiş penguenlerin yuvalarına giden yollardaki boş hücreler. */
  const laneCells = () => {
    const cells: { x: number; y: number }[] = [];
    if (params.freeIgloos) return cells;
    penguins.forEach((p, i) => {
      const home = igloos[i]!;
      const v = DIR_VECTORS[p.dir];
      for (let cx = p.x + v.x, cy = p.y + v.y; cx !== home.x || cy !== home.y; cx += v.x, cy += v.y) {
        if (free(cx, cy)) cells.push({ x: cx, y: cy });
      }
    });
    return cells;
  };

  for (const color of colors) {
    let placed = false;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) {
      const lanes = rng.next() < (params.blockBias ?? 0) ? laneCells() : [];
      const spot = lanes.length > 0 ? rng.pick(lanes) : { x: rng.int(0, width - 1), y: rng.int(0, height - 1) };
      const { x, y } = spot;
      if (!free(x, y)) continue;
      const dir = rng.pick(DIRECTIONS);
      let home: { x: number; y: number };
      if (params.freeIgloos) {
        home = { x: rng.int(0, width - 1), y: rng.int(0, height - 1) };
        if (!free(home.x, home.y) || (home.x === x && home.y === y)) continue;
      } else {
        // Igloo penguenin yolunda, en az iki hücre ötede (bitişik igloo bulmaca değil).
        const spots = ray(x, y, dir).filter((c, i) => i >= 1 && free(c.x, c.y));
        if (spots.length === 0) continue;
        home = rng.pick(spots);
      }
      taken.add(key(x, y));
      taken.add(key(home.x, home.y));
      const id = characterForColor(color).id;
      penguins.push({ id, character: id, color, dir, x, y });
      igloos.push({ color, x: home.x, y: home.y });
      placed = true;
    }
    if (!placed) return null;
  }

  // İkizler: var olan bir igloya başka bir yönden giren aynı renkte ikinci penguen.
  for (let t = 0; t < (params.twins ?? 0); t++) {
    let placed = false;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) {
      const home = rng.pick(igloos);
      const first = penguins.find((p) => p.color === home.color)!;
      if (penguins.filter((p) => p.color === home.color).length > 1) continue;
      const dir = rng.pick(DIRECTIONS.filter((d) => d !== first.dir));
      const v = DIR_VECTORS[dir];
      const distance = rng.int(2, Math.max(width, height) - 1);
      const x = home.x - v.x * distance;
      const y = home.y - v.y * distance;
      if (!free(x, y)) continue;
      // Arada sabit engel olmamalı.
      let clear = true;
      for (let i = 1; i < distance; i++) if (!isIce(x + v.x * i, y + v.y * i)) clear = false;
      if (!clear) continue;
      taken.add(key(x, y));
      penguins.push({ id: `${first.id}2`, character: first.character, color: first.color, dir, x, y });
      placed = true;
    }
    if (!placed) return null;
  }

  // Çatlak buz: boş buz hücrelerine. Yolların üstüne düşüp düşmediğini ölçüm söyler.
  for (let i = 0; i < (params.cracked ?? 0); i++) {
    let placed = false;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) {
      const x = rng.int(0, width - 1);
      const y = rng.int(0, height - 1);
      if (!free(x, y)) continue;
      grid[y]![x] = '+';
      placed = true;
    }
    if (!placed) return null;
  }

  // Uyuyanlar: listenin sonundaki penguenler uyuyarak başlar.
  const sleepers = Math.min(params.sleepers ?? 0, penguins.length - 1);
  for (let i = penguins.length - sleepers; i < penguins.length; i++) penguins[i] = { ...penguins[i]!, asleep: true };

  return {
    id: 'candidate',
    grid: grid.map((row) => row.join('')),
    penguins,
    igloos,
    ...(params.rules ? { rules: params.rules } : {}),
  };
}
