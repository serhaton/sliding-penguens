/**
 * Dalgalı (uzun) bölüm üretici.
 *
 * Bir bölüm = sabit bir tahta (kayalar + igloolar) + art arda gelen penguen
 * grupları. Önce tahta kurulur, sonra her dalga için o tahtada koşullara uyan
 * bir penguen yerleşimi aranır. Her dalga tek başına ölçüldüğü için en az hamle
 * sayısı kesin kalır: bölümün par'ı dalgaların par'larının toplamıdır.
 */
import { characterForColor } from '@/data/characters';
import { DIRECTIONS, stageLevel, type LevelDef, type PenguinColor, type PenguinDef } from '@/engine';

import { measure, type Metrics } from './metrics';
import type { Rng } from './rng';

type Range = readonly [min: number, max: number];

export interface WaveSpec {
  penguins: number;
  par: Range;
  /** En iyi çözümde en az kaç "penguene çarpıp durma" olsun. */
  minTeamwork?: number;
  /** En iyi çözümde en fazla kaç yerinde dönme olsun (varsayılan 0). */
  maxSpins?: number;
  /** Çıkmaz serbest mi (varsayılan hayır). */
  allowDeadEnds?: boolean;
  /** Bu dalgada uyuyarak gelen penguen sayısı. */
  sleepers?: number;
  /** Bu dalgada çatlaklar bulmacayı değiştirmeli. */
  cracksMatter?: boolean;
}

export interface WaveLevelParams {
  width: number;
  height: number;
  rocks: number;
  /** Çatlak buz hücresi sayısı. Her dalgada buz yeniden donar (tahta baştan kurulur). */
  cracked?: number;
  /** Tahtadaki igloo (renk) sayısı. */
  colors: number;
  waves: readonly WaveSpec[];
  rules?: LevelDef['rules'];
  /** Dalga başına denenecek yerleşim sayısı (verilmezse penguen sayısına göre). */
  triesPerWave?: number;
  /** Ölçümde gezilecek en fazla durum. */
  maxStates?: number;
}

export interface WaveLevel {
  level: LevelDef;
  metrics: Metrics[];
}

/**
 * Dalga başına varsayılan deneme sayısı. Tek penguen çabuk tutar; "çıkmazsız
 * ve park gerektiren" iki penguenli yerleşimler nadirdir (binde bir kadar) ama
 * ölçümü ucuzdur; üç penguenli ölçüm pahalıdır.
 */
const DEFAULT_TRIES: Record<number, number> = { 1: 300, 2: 5000, 3: 1200 };

/**
 * Koşullar tam tutmazsa kabul edilecek sapma: par en çok 2 hamle, "çarpıp
 * durma" sayısı en çok 1 eksik olabilir. Tam uyan yerleşim her zaman önceliklidir.
 */
const PAR_SLACK = 2;
const TEAMWORK_SLACK = 1;

const COLORS: readonly PenguinColor[] = ['blue', 'red', 'yellow', 'green', 'orange', 'purple'];

/** Koşullara uyan bir bölüm kurulamazsa null; çağıran yeni bir tahtayla yeniden dener. */
export function generateWaveLevel(rng: Rng, params: WaveLevelParams): WaveLevel | null {
  const { width, height } = params;
  const grid: string[][] = Array.from({ length: height }, () => Array<string>(width).fill('.'));
  for (let i = 0; i < params.rocks; i++) grid[rng.int(0, height - 1)]![rng.int(0, width - 1)] = '#';

  const taken = new Set<number>();
  const key = (x: number, y: number) => y * width + x;
  const randomFree = (blocked: Set<number>) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const x = rng.int(0, width - 1);
      const y = rng.int(0, height - 1);
      if (grid[y]![x] === '.' && !blocked.has(key(x, y))) return { x, y };
    }
    return null;
  };

  // Igloolar bölüm boyunca sabit.
  const colors = rng.shuffle(COLORS).slice(0, params.colors);
  const igloos: LevelDef['igloos'] = [];
  for (const color of colors) {
    const spot = randomFree(taken);
    if (!spot) return null;
    taken.add(key(spot.x, spot.y));
    igloos.push({ color, x: spot.x, y: spot.y });
  }

  // Çatlak buz: igloo olmayan boş buzlara. Penguenler çatlağın üstünde başlamaz.
  for (let i = 0; i < (params.cracked ?? 0); i++) {
    const spot = randomFree(taken);
    if (!spot) return null;
    grid[spot.y]![spot.x] = '+';
  }

  const base: LevelDef = {
    id: 'candidate',
    grid: grid.map((row) => row.join('')),
    penguins: [],
    igloos,
    ...(params.rules ? { rules: params.rules } : {}),
  };

  const groups: PenguinDef[][] = [];
  const metrics: Metrics[] = [];
  /** Aynı renk dizilimi art arda gelmesin diye son dalganın renkleri. */
  let previous = '';

  for (const spec of params.waves) {
    let found: { penguins: PenguinDef[]; metrics: Metrics } | null = null;
    /** Hedef par aralığını kaçıran ama diğer koşullara uyan en yakın yerleşim. */
    let nearest: { penguins: PenguinDef[]; metrics: Metrics; miss: number; signature: string } | null = null;
    const tries = params.triesPerWave ?? DEFAULT_TRIES[spec.penguins] ?? 1000;

    for (let attempt = 0; attempt < tries && !found; attempt++) {
      const waveColors = rng.shuffle(colors).slice(0, spec.penguins);
      if (waveColors.length < spec.penguins) return null;
      const signature = [...waveColors].sort().join();
      if (signature === previous && colors.length > spec.penguins) continue;

      const used = new Set(taken);
      const penguins: PenguinDef[] = [];
      for (const color of waveColors) {
        const spot = randomFree(used);
        if (!spot) break;
        used.add(key(spot.x, spot.y));
        const id = characterForColor(color).id;
        penguins.push({ id, character: id, color, dir: rng.pick(DIRECTIONS), x: spot.x, y: spot.y });
      }
      if (penguins.length < spec.penguins) continue;
      const sleepers = Math.min(spec.sleepers ?? 0, penguins.length - 1);
      for (let i = penguins.length - sleepers; i < penguins.length; i++) penguins[i] = { ...penguins[i]!, asleep: true };

      const m = measure({ ...base, penguins }, params.maxStates);
      if (!m) continue;
      if (m.spins > (spec.maxSpins ?? 0)) continue;
      if (!spec.allowDeadEnds && m.deadEnds !== 0) continue;
      if (spec.cracksMatter && !m.cracksMatter) continue;
      const teamworkMiss = Math.max(0, (spec.minTeamwork ?? 0) - m.teamwork);
      // Park gerektiren dalgada en az bir park hamlesi şart; fazlası gevşetilebilir.
      if (teamworkMiss > TEAMWORK_SLACK || ((spec.minTeamwork ?? 0) > 0 && m.teamwork === 0)) continue;

      const parMiss = m.par < spec.par[0] ? spec.par[0] - m.par : m.par > spec.par[1] ? m.par - spec.par[1] : 0;
      // Park eksikliği par sapmasından daha ağır sayılır.
      const miss = parMiss + teamworkMiss * 3;
      if (parMiss > PAR_SLACK) continue;
      if (miss === 0) {
        found = { penguins, metrics: m };
        previous = signature;
      } else if (!nearest || miss < nearest.miss) {
        nearest = { penguins, metrics: m, miss, signature };
      }
    }
    if (!found && nearest) {
      found = { penguins: nearest.penguins, metrics: nearest.metrics };
      previous = nearest.signature;
    }
    if (!found) return null;
    groups.push(found.penguins);
    metrics.push(found.metrics);
  }

  const level: LevelDef = {
    ...base,
    penguins: groups[0]!,
    waves: groups.slice(1),
    par: metrics.reduce((sum, m) => sum + m.par, 0),
    wavePars: metrics.map((m) => m.par),
    waveSolutions: metrics.map((m) => m.solution),
  };
  // Kendi kendini doğrula: her dalga geçerli bir bölüm olmalı.
  for (let i = 0; i < groups.length; i++) stageLevel(level, i);
  return { level, metrics };
}
