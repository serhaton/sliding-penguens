import { createGame, replay, stageLevel, type LevelDef } from '@/engine';

import { generateCandidate } from '../generate';
import { measure } from '../metrics';
import { createRng } from '../rng';
import { selectLevels } from '../select';
import { similarity } from '../similarity';
import { generateWaveLevel } from '../waves';
import { WORLD1_A_SLOTS } from '../world1';

const params = { width: 6, height: 6, penguins: 4, rocks: 2, water: 1, blockBias: 0.6 };

function candidates(seed: number, count: number): LevelDef[] {
  const rng = createRng(seed);
  const out: LevelDef[] = [];
  while (out.length < count) {
    const c = generateCandidate(rng, params);
    if (c) out.push(c);
  }
  return out;
}

describe('üretici', () => {
  it('aynı tohum aynı bölümleri verir', () => {
    expect(candidates(42, 20)).toEqual(candidates(42, 20));
    expect(candidates(42, 20)).not.toEqual(candidates(43, 20));
  });

  it('her aday motorun kabul ettiği geçerli bir tahtadır', () => {
    for (const c of candidates(7, 200)) expect(() => createGame(c)).not.toThrow();
  });

  it('ikizler aynı renkte ve aynı igloyu paylaşır', () => {
    const rng = createRng(3);
    let found = 0;
    for (let i = 0; i < 200 && found < 20; i++) {
      const c = generateCandidate(rng, { ...params, penguins: 3, twins: 1 });
      if (!c) continue;
      found++;
      expect(c.penguins).toHaveLength(4);
      expect(c.igloos).toHaveLength(3);
      expect(new Set(c.penguins.map((p) => p.id)).size).toBe(4);
    }
    expect(found).toBe(20);
  });
});

describe('ölçütler', () => {
  it('ölçülen çözüm bölümü par hamlede bitirir', () => {
    let measured = 0;
    for (const c of candidates(11, 300)) {
      const m = measure(c);
      if (!m) continue;
      measured++;
      const end = replay(createGame(c), m.solution.map((penguinId) => ({ penguinId })));
      expect(end.state.result).not.toBeNull();
      expect(m.par).toBe(m.solution.length);
      expect(m.extraTaps).toBe(m.par - m.penguins);
      expect(m.blocked).toBeLessThanOrEqual(m.penguins);
    }
    expect(measured).toBeGreaterThan(20);
  });

  it('geçersiz ya da çözümsüz bölüm için null döner', () => {
    expect(measure({ id: 'x', grid: ['..'], penguins: [], igloos: [] })).toBeNull();
    expect(
      measure({
        id: 'x',
        grid: ['...'],
        penguins: [{ color: 'blue', dir: 'left', x: 0, y: 0 }],
        igloos: [{ color: 'blue', x: 2, y: 0 }],
      }),
    ).toBeNull();
  });
});

describe('benzerlik', () => {
  const [a, b] = candidates(5, 2) as [LevelDef, LevelDef];

  it('bölüm kendisiyle ve ayna görüntüsüyle aynıdır', () => {
    expect(similarity(a, a)).toBe(1);
    const flip = { left: 'right', right: 'left', up: 'up', down: 'down' } as const;
    const mirrored: LevelDef = {
      ...a,
      penguins: a.penguins.map((p) => ({ ...p, x: 5 - p.x, dir: flip[p.dir] })),
      igloos: a.igloos.map((g) => ({ ...g, x: 5 - g.x })),
    };
    expect(similarity(a, mirrored)).toBe(1);
  });

  it('simetriktir ve farklı bölümlerde 1 değildir', () => {
    expect(similarity(a, b)).toBe(similarity(b, a));
    expect(similarity(a, b)).toBeLessThan(1);
  });

  it('farklı boyutlu tahtalar benzemez', () => {
    expect(similarity(a, { ...a, grid: [...a.grid, '......'] })).toBe(0);
  });
});

describe('seçim', () => {
  it('yuvanın koşullarına uyan, çıkmazsız bölümler seçer', () => {
    const slots = WORLD1_A_SLOTS.slice(0, 4);
    const { selected, missing } = selectLevels(createRng(1), slots, [], {
      candidatesPerSlot: 1500,
      maxSimilarity: 0.4,
    });
    expect(missing).toEqual([]);
    selected.forEach(({ slot, level, metrics }) => {
      expect(level.id).toBe(String(slot.level));
      expect(level.par).toBe(metrics.par);
      expect(metrics.deadEnds).toBe(0);
      expect(metrics.blocked).toBeGreaterThanOrEqual(slot.blocked[0]);
      expect(metrics.blocked).toBeLessThanOrEqual(slot.blocked[1]);
    });
    // Seçilenler birbirine fazla benzemez.
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        expect(similarity(selected[i]!.level, selected[j]!.level)).toBeLessThanOrEqual(0.4);
      }
    }
  });
});

describe('dalgalı bölüm üretimi', () => {
  const params = {
    width: 5,
    height: 6,
    rocks: 2,
    colors: 3,
    rules: { turnOnBump: true },
    waves: [
      { penguins: 1, par: [1, 3] as const },
      { penguins: 1, par: [2, 4] as const },
      { penguins: 2, par: [3, 6] as const },
    ],
    triesPerWave: 400,
  };

  function firstLevel(seed: number) {
    const rng = createRng(seed);
    for (let i = 0; i < 40; i++) {
      const result = generateWaveLevel(rng, params);
      if (result) return result;
    }
    throw new Error('bölüm üretilemedi');
  }

  it('her dalga aynı tahtada, kendi başına çözülebilir bir bulmacadır', () => {
    const { level, metrics } = firstLevel(1);
    expect(level.waves).toHaveLength(2);
    expect(level.wavePars).toEqual(metrics.map((m) => m.par));
    expect(level.par).toBe(metrics.reduce((sum, m) => sum + m.par, 0));
    level.waveSolutions!.forEach((solution, wave) => {
      const stage = stageLevel(level, wave);
      expect(stage.grid).toEqual(level.grid);
      expect(stage.igloos).toEqual(level.igloos);
      const end = replay(createGame(stage), solution.map((penguinId) => ({ penguinId })));
      expect(end.state.result).not.toBeNull();
    });
  });

  it('aynı tohum aynı bölümü verir', () => {
    expect(firstLevel(5).level).toEqual(firstLevel(5).level);
  });
});
