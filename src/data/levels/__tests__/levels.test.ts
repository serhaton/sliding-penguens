/** Bütün bölümler için otomatik doğrulama: geçerli, çözülebilir, par doğru. */
import { characters } from '@/data/characters';
import { createGame, legalMoves, replay, stageLevel, waveCount } from '@/engine';
import { analyzeLevel, solve } from '@/solver';

import { getMechanic, mechanics } from '@/data/mechanics';

import { FORGIVING_LEVELS, levels, levelSections } from '../index';

describe('Dünya 1 yapısı', () => {
  it('30 bölüm: 10 sabit yön, 10 çarpınca dön, 10 dalgalı', () => {
    expect(levels).toHaveLength(30);
    expect(levelSections.map((s) => [s.key, s.first, s.levels.length])).toEqual([
      ['A', 1, 10],
      ['B', 11, 10],
      ['C', 21, 10],
    ]);
    expect(levels.map((l) => l.id)).toEqual(Array.from({ length: 30 }, (_, i) => String(i + 1)));
  });

  it('kurallar bölümlere göre: A kapalı, B ve C "çarpınca dön"', () => {
    for (const section of levelSections) {
      for (const level of section.levels) {
        expect(createGame(level).rules.turnOnBump).toBe(section.key !== 'A');
      }
    }
  });

  it('dalgalar yalnızca C bölümünde; her C bölümü en az 4 dalga', () => {
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

  it('yeni mekanik ilk bölümünde tanıtılır ve tanıtımı tanımlıdır', () => {
    expect(levels.filter((l) => l.intro).map((l) => [l.id, l.intro])).toEqual([
      ['11', 'turn'],
      ['21', 'waves'],
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
