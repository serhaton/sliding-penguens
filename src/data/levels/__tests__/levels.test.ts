/** Bütün bölümler için otomatik doğrulama: geçerli, çözülebilir, par doğru. */
import { characters } from '@/data/characters';
import { createGame, legalMoves, replay, stageLevel, waveCount } from '@/engine';
import { analyzeLevel, solve } from '@/solver';

import { antarctica } from '@/data/continents';
import { getMechanic, mechanics } from '@/data/mechanics';

import { FORGIVING_LEVELS, levels, levelSections } from '../index';

describe('Antarktika yapısı', () => {
  it('90 bölüm: üç macera, her biri 10 bölümlük üç bölge', () => {
    expect(levels).toHaveLength(90);
    expect(levelSections.map((s) => [s.episode, s.key, s.first, s.levels.length])).toEqual([
      [1, 'A', 1, 10],
      [1, 'B', 11, 10],
      [1, 'C', 21, 10],
      [2, 'A', 31, 10],
      [2, 'B', 41, 10],
      [2, 'C', 51, 10],
      [3, 'A', 61, 10],
      [3, 'B', 71, 10],
      [3, 'C', 81, 10],
    ]);
    expect(levels.map((l) => l.id)).toEqual(Array.from({ length: 90 }, (_, i) => String(i + 1)));
    for (const section of levelSections) {
      for (const level of section.levels) expect(level.world).toBe(section.episode);
    }
  });

  it('kıta tanımı katalogla uyumlu: her maceranın bölüm sayısı tutar', () => {
    for (const episode of antarctica.episodes) {
      expect(levels.filter((l) => l.world === episode.id)).toHaveLength(episode.levelCount);
    }
  });

  it('kurallar: yalnızca Macera 1 A sabit yön, gerisi "çarpınca dön"', () => {
    for (const section of levelSections) {
      for (const level of section.levels) {
        expect(createGame(level).rules.turnOnBump).toBe(!(section.episode === 1 && section.key === 'A'));
      }
    }
  });

  it('dalgalar yalnızca C bölgelerinde; her C bölümü en az 4 dalga', () => {
    for (const section of levelSections) {
      for (const level of section.levels) {
        if (section.key === 'C') {
          expect(waveCount(level)).toBeGreaterThanOrEqual(4);
          expect(level.wavePars).toHaveLength(waveCount(level));
        } else {
          expect(waveCount(level)).toBe(1);
        }
      }
    }
  });

  it('mekanikler macerasında başlar: çatlak buz 31\'den, uyuyan penguen 61\'den önce yok', () => {
    for (const level of levels) {
      const number = Number(level.id);
      const stages = Array.from({ length: waveCount(level) }, (_, i) => stageLevel(level, i));
      const cracked = level.grid.some((row) => row.includes('+'));
      const asleep = stages.some((stage) => stage.penguins.some((p) => p.asleep));
      if (number <= 30) expect(cracked).toBe(false);
      if (number <= 60) expect(asleep).toBe(false);
      // Macera 2'nin dalgasız bölümlerinin hepsinde çatlak buz var.
      if (number > 30 && number <= 50) expect(cracked).toBe(true);
      // Macera 3'ün dalgasız bölümlerinin hepsinde bir uykucu var.
      if (number > 60 && number <= 80) expect(asleep).toBe(true);
    }
  });

  it('uykucular: her aşamada en az bir uyanık penguen var', () => {
    for (const level of levels) {
      for (let i = 0; i < waveCount(level); i++) {
        expect(stageLevel(level, i).penguins.some((p) => !p.asleep)).toBe(true);
      }
    }
  });

  it('yeni mekanik ilk bölümünde tanıtılır ve tanıtımı tanımlıdır', () => {
    expect(levels.filter((l) => l.intro).map((l) => [l.id, l.intro])).toEqual([
      ['11', 'turn'],
      ['21', 'waves'],
      ['31', 'cracked'],
      ['61', 'sleep'],
    ]);
    for (const level of levels) if (level.intro) expect(getMechanic(level.intro)).toBeDefined();
  });

  it('tanıtım gösterimleri oynatılabilir: hamle dizisi gösterimi bitirir', () => {
    for (const mechanic of Object.values(mechanics)) {
      let moves = [...mechanic.script];
      for (let wave = 0; wave < waveCount(mechanic.demo); wave++) {
        let state = createGame(stageLevel(mechanic.demo, wave));
        while (!state.result) {
          const penguinId = moves.shift();
          expect(penguinId).toBeDefined();
          state = replay(state, [{ penguinId: penguinId! }]).state;
        }
      }
      expect(moves).toEqual([]);
    }
  });
});

describe('bölümler', () => {
  it('kimlikler benzersiz', () => {
    expect(new Set(levels.map((l) => l.id)).size).toBe(levels.length);
  });

  describe.each(levels.map((level) => [level.id, level] as const))('bölüm %s', (_id, level) => {
    // Dalgalı bölümde her dalga ayrı bir bulmacadır; dalgasız bölümde tek aşama var.
    const stages = Array.from({ length: waveCount(level) }, (_, i) => stageLevel(level, i));

    it('her aşama geçerli bir tahta', () => {
      for (const stage of stages) expect(() => createGame(stage)).not.toThrow();
    });

    it('çözülebilir ve kayıtlı par en kısa çözümle aynı', () => {
      let total = 0;
      for (const stage of stages) {
        const result = solve(createGame(stage));
        expect(result.status).toBe('solved');
        if (result.status === 'solved') {
          expect(stage.par).toBe(result.par);
          total += result.par;
        }
      }
      expect(level.par).toBe(total);
    });

    it('kayıtlı çözüm her aşamayı par hamlede bitirir', () => {
      for (const stage of stages) {
        const end = replay(createGame(stage), (stage.solution ?? []).map((penguinId) => ({ penguinId })));
        expect(end.state.result).toMatchObject({ winner: 0, reason: 'allHome' });
        expect(end.state.moveCount).toBe(stage.par);
      }
    });

    it('her aşamanın başında en az bir penguen oynanabiliyor', () => {
      for (const stage of stages) expect(legalMoves(createGame(stage)).length).toBeGreaterThan(0);
    });

    if (levels.indexOf(level) < FORGIVING_LEVELS) {
      it('erken bölüm: çıkmaza girilemez (her sıra bitirilebilir)', () => {
        const analysis = analyzeLevel(createGame(level));
        expect(analysis.truncated).toBe(false);
        expect(analysis.deadEnds).toBe(0);
      });
    }

    it('karakterler tanımlı ve renkleri penguenle uyumlu', () => {
      for (const p of stages.flatMap((stage) => stage.penguins)) {
        if (!p.character) continue;
        const character = characters[p.character as keyof typeof characters];
        expect(character).toBeDefined();
        expect(character.color).toBe(p.color);
      }
    });
  });
});
