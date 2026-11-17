/** Günlük bulmaca seçimi, bulmaca serisi ve giriş döngüsü. */
import puzzles from '@/data/daily/puzzles.json';
import { getMechanic } from '@/data/mechanics';
import { economy } from '@/economy/economy.config';
import { dailyPuzzleKey, loginKey } from '@/economy/rewards';
import { createGame, replay, type LevelDef } from '@/engine';
import { DAILY_POOL_SIZE } from '@/generator/daily';
import { solve } from '@/solver';

import { cosmetics, getCosmetic } from '@/data/cosmetics';

import { avatarFrom, ownedCosmetics, withoutScarf } from '../avatar';
import { addDays, dailyPuzzleFor, dayIndex, loginStatus, puzzleStreak } from '../daily';

const pool = puzzles as LevelDef[];

describe('tarih yardımcıları', () => {
  it('gün numarası ardışık günlerde bir artar (ay ve yıl sonlarında da)', () => {
    expect(dayIndex('2026-11-18') - dayIndex('2026-11-17')).toBe(1);
    expect(dayIndex('2027-01-01') - dayIndex('2026-12-31')).toBe(1);
    expect(dayIndex('2028-03-01') - dayIndex('2028-02-28')).toBe(2);
  });

  it('gün ekleme ay ve yıl sınırlarını aşar', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-11-17', 0)).toBe('2026-11-17');
  });
});

describe('günlük bulmaca havuzu', () => {
  it(`${DAILY_POOL_SIZE} bulmaca; hepsi çözülebilir ve kayıtlı par doğru`, () => {
    expect(pool).toHaveLength(DAILY_POOL_SIZE);
    for (const level of pool) {
      const result = solve(createGame(level));
      expect(result.status).toBe('solved');
      if (result.status === 'solved') expect(result.par).toBe(level.par);
      const end = replay(createGame(level), level.solution!.map((penguinId) => ({ penguinId })));
      expect(end.state.result).toMatchObject({ winner: 0, reason: 'allHome' });
    }
  });

  it('üç mekanik sırayla döner', () => {
    const kinds = pool.map((level) => dailyPuzzleFor('2026-01-01', Infinity, [level]).intro);
    for (let i = 0; i < kinds.length; i++) expect(kinds[i]).toBe(['turn', 'cracked', 'sleep'][i % 3]);
  });

  it('aynı gün aynı bulmaca; ertesi gün sıradaki; havuz bitince başa döner', () => {
    const a = dailyPuzzleFor('2026-11-17');
    expect(dailyPuzzleFor('2026-11-17')).toEqual(a);
    expect(a.id).toBe('daily-2026-11-17');
    expect(dailyPuzzleFor('2026-11-18').grid).not.toEqual(a.grid);
    expect(dailyPuzzleFor(addDays('2026-11-17', pool.length)).grid).toEqual(a.grid);
  });

  it('oyuncu macerada görmediği mekanikle karşılaşmaz', () => {
    for (let i = 0; i < pool.length; i++) {
      const date = addDays('2026-11-17', i);
      expect(dailyPuzzleFor(date, 7).intro).toBe('turn');
      expect(dailyPuzzleFor(date, 45).intro).not.toBe('sleep');
    }
    // İlerlemiş oyuncu üç mekaniği de görür.
    const kinds = new Set(pool.map((_, i) => dailyPuzzleFor(addDays('2026-11-17', i), 61).intro));
    expect([...kinds].sort()).toEqual(['cracked', 'sleep', 'turn']);
  });

  it('bulmacanın tanıtımı tanımlı bir mekaniktir', () => {
    for (let i = 0; i < pool.length; i++) {
      expect(getMechanic(dailyPuzzleFor(addDays('2026-11-17', i)).intro)).toBeDefined();
    }
  });
});

describe('bulmaca serisi', () => {
  const solved = (...dates: string[]) => dates.map(dailyPuzzleKey);

  it('hiç çözülmediyse 0', () => {
    expect(puzzleStreak([], '2026-11-17')).toBe(0);
  });

  it('bugün dahil art arda günleri sayar', () => {
    expect(puzzleStreak(solved('2026-11-15', '2026-11-16', '2026-11-17'), '2026-11-17')).toBe(3);
  });

  it('bugün henüz çözülmediyse dünle biten seri korunur', () => {
    expect(puzzleStreak(solved('2026-11-15', '2026-11-16'), '2026-11-17')).toBe(2);
  });

  it('bir gün atlanınca seri sıfırlanır', () => {
    expect(puzzleStreak(solved('2026-11-14', '2026-11-15'), '2026-11-17')).toBe(0);
    expect(puzzleStreak(solved('2026-11-14', '2026-11-15', '2026-11-17'), '2026-11-17')).toBe(1);
  });

  it('giriş ödülü kayıtları seriye karışmaz', () => {
    expect(puzzleStreak([loginKey('2026-11-17', 1)], '2026-11-17')).toBe(0);
  });
});

describe('günlük giriş döngüsü', () => {
  it('ilk gün: 1. gün, alınmamış', () => {
    expect(loginStatus([], '2026-11-17')).toEqual({ day: 1, reward: economy.loginStreak[0], claimed: false });
  });

  it('dün alındıysa sıradaki gün', () => {
    expect(loginStatus([loginKey('2026-11-16', 3)], '2026-11-17')).toMatchObject({ day: 4, claimed: false });
  });

  it('bugün alındıysa o gün ve alınmış', () => {
    expect(loginStatus([loginKey('2026-11-16', 3), loginKey('2026-11-17', 4)], '2026-11-17')).toMatchObject({
      day: 4,
      claimed: true,
    });
  });

  it('7. günden sonra 1. güne döner', () => {
    expect(loginStatus([loginKey('2026-11-16', 7)], '2026-11-17')).toMatchObject({ day: 1 });
  });

  it('bir gün atlanınca 1. günden başlar', () => {
    expect(loginStatus([loginKey('2026-11-15', 5)], '2026-11-17')).toMatchObject({ day: 1, claimed: false });
  });

  it('7. gün büyük ödül', () => {
    const last = loginStatus([loginKey('2026-11-16', 6)], '2026-11-17');
    expect(last.day).toBe(7);
    expect(last.reward).toBe(Math.max(...economy.loginStreak));
  });
});

describe('profil pengueni', () => {
  const owned = (...ids: string[]) => new Set(ids);

  it('boş profil: varsayılan karakter, kostümsüz', () => {
    expect(avatarFrom({}, owned())).toEqual({ character: 'piti', costume: {} });
  });

  it('sahip olunan takılı kostümler görünür (şapka, saç, gözlük, atkı)', () => {
    const avatar = avatarFrom(
      { character: 'nar', hat: 'hat.crown', hair: 'hair.curls', glasses: 'glasses.shades', scarf: 'scarf.rainbow' },
      owned('hat.crown', 'hair.curls', 'glasses.shades', 'scarf.rainbow'),
    );
    expect(avatar).toEqual({
      character: 'nar',
      costume: { hat: 'crown', hair: 'curls', glasses: 'shades', scarf: 'rainbow' },
    });
  });

  it('sahip olunmayan ya da yanlış yuvadaki ürün takılı sayılmaz', () => {
    expect(avatarFrom({ hat: 'hat.crown' }, owned()).costume.hat).toBeUndefined();
    expect(avatarFrom({ hat: 'glasses.round' }, owned('glasses.round')).costume.hat).toBeUndefined();
  });

  it('bilinmeyen karakter varsayılana düşer', () => {
    expect(avatarFrom({ character: 'yok' }, owned()).character).toBe('piti');
  });

  it('pakete özel kostüm coinle değil, paketin sahipliğiyle açılır', () => {
    expect(ownedCosmetics({ 'hat.beanie': 200 }).has('hat.explorer')).toBe(false);
    const set = ownedCosmetics({ 'hat.beanie': 200 }, ['starter.pack']);
    expect(set.has('hat.explorer')).toBe(true);
    expect(set.has('hat.beanie')).toBe(true);
    expect(set.has('scarf.aurora')).toBe(false);
  });

  it('düello tahtasında özel atkı takılmaz, gerisi kalır', () => {
    const avatar = avatarFrom({ hat: 'hat.cap', scarf: 'scarf.gold' }, owned('hat.cap', 'scarf.gold'));
    expect(withoutScarf(avatar).costume).toEqual({ hat: 'cap' });
  });

  it('her kostümün kimliği benzersiz ve gökkuşağı atkı en pahalısı', () => {
    expect(new Set(cosmetics.map((c) => c.id)).size).toBe(cosmetics.length);
    expect(Math.max(...cosmetics.map((c) => c.price))).toBe(getCosmetic('scarf.rainbow')!.price);
  });
});
