/**
 * İki bölüm birbirine ne kadar benziyor? Renkleri yok sayar; yatay/dikey
 * çevirme ve 180° döndürmeyi aynı bölüm sayar. Üretici, seçilmiş bölümlere
 * çok benzeyen adayları eler ki oyuncu "bunu az önce oynadım" demesin.
 */
import type { Direction, LevelDef } from '@/engine';

type Transform = (x: number, y: number, dir?: Direction) => { x: number; y: number; dir?: Direction };

const FLIP_H: Record<Direction, Direction> = { left: 'right', right: 'left', up: 'up', down: 'down' };
const FLIP_V: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'left', right: 'right' };

function transforms(width: number, height: number): Transform[] {
  return [
    (x, y, dir) => ({ x, y, dir }),
    (x, y, dir) => ({ x: width - 1 - x, y, dir: dir && FLIP_H[dir] }),
    (x, y, dir) => ({ x, y: height - 1 - y, dir: dir && FLIP_V[dir] }),
    (x, y, dir) => ({ x: width - 1 - x, y: height - 1 - y, dir: dir && FLIP_V[FLIP_H[dir]] }),
  ];
}

function features(level: LevelDef, transform: Transform): Set<string> {
  const set = new Set<string>();
  for (const p of level.penguins) {
    const t = transform(p.x, p.y, p.dir);
    set.add(`p:${t.x},${t.y},${t.dir}`);
  }
  for (const g of level.igloos) {
    const t = transform(g.x, g.y);
    set.add(`g:${t.x},${t.y}`);
  }
  return set;
}

/** 0 (hiç benzemez) – 1 (aynı yerleşim). Boyutlar farklıysa 0. */
export function similarity(a: LevelDef, b: LevelDef): number {
  const width = a.grid[0]!.length;
  const height = a.grid.length;
  if (b.grid[0]!.length !== width || b.grid.length !== height) return 0;
  const base = features(a, (x, y, dir) => ({ x, y, dir }));
  let best = 0;
  for (const transform of transforms(width, height)) {
    const other = features(b, transform);
    let shared = 0;
    for (const f of base) if (other.has(f)) shared++;
    best = Math.max(best, shared / (base.size + other.size - shared));
  }
  return best;
}
