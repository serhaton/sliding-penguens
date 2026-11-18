/** Başarım koşulları. */
import { economy, type AchievementId } from '@/economy/economy.config';
import { en } from '@/i18n/en';
import { tr } from '@/i18n/tr';

import {
  achievementIds,
  achievementTitleKey,
  earnedAchievements,
  gameCenterAchievementId,
  leaderboards,
  type AchievementInput,
} from '../achievements';

const none: AchievementInput = {
  stars: {},
  streak: 0,
  duelWins: 0,
  beatHard: false,
  cosmetics: 0,
  noUndoWins: 0,
  duelBlocks: 0,
};
/** `from`–`to` arası bölümler `stars` yıldızla bitirilmiş. */
const cleared = (from: number, to: number, stars = 1) =>
  Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [String(from + i), stars]));
const earned = (input: Partial<AchievementInput>) => earnedAchievements({ ...none, ...input });

describe('başarımlar', () => {
  it('hiçbir şey yapılmadıysa başarım yok', () => {
    expect(earned({})).toEqual([]);
  });

  it('ilk bölüm: ilk igloo', () => {
    expect(earned({ stars: { '1': 1 } })).toEqual(['first-igloo']);
  });

  it('bölüm sayısı eşikleri', () => {
    expect(earned({ stars: cleared(1, 9) })).not.toContain('levels-10');
    expect(earned({ stars: cleared(1, 10) })).toContain('levels-10');
    const all = earned({ stars: cleared(1, 90) });
    for (const id of ['levels-30', 'levels-60', 'levels-90'] as const) expect(all).toContain(id);
  });

  it('3 yıldız sayısı yalnızca 3 yıldızlı bölümleri sayar', () => {
    expect(earned({ stars: cleared(1, 10, 2) })).not.toContain('three-stars-10');
    expect(earned({ stars: cleared(1, 10, 3) })).toContain('three-stars-10');
    expect(earned({ stars: cleared(1, 50, 3) })).toContain('three-stars-50');
  });

  it('ustalıklar ilgili bölgenin tamamını ister', () => {
    expect(earned({ stars: cleared(11, 19) })).not.toContain('turn-master');
    expect(earned({ stars: cleared(11, 20) })).toContain('turn-master');
    expect(earned({ stars: cleared(31, 59) })).not.toContain('cracked-ice-master');
    expect(earned({ stars: cleared(31, 60) })).toContain('cracked-ice-master');
    expect(earned({ stars: cleared(61, 90) })).toContain('sleepy-friend');
  });

  it('seri, düello, sayaç ve koleksiyon başarımları', () => {
    expect(earned({ streak: 7 })).toEqual(['streak-7']);
    expect(earned({ streak: 30 })).toEqual(['streak-7', 'streak-30']);
    expect(earned({ duelWins: 1 })).toEqual(['first-duel-win']);
    expect(earned({ duelWins: 25 })).toContain('duel-wins-25');
    expect(earned({ beatHard: true })).toEqual(['beat-hard-cpu']);
    expect(earned({ noUndoWins: 10 })).toEqual(['no-undo-10']);
    expect(earned({ duelBlocks: 3 })).toEqual(['block-3']);
    expect(earned({ cosmetics: 5 })).toEqual(['collector-5']);
  });

  it('her başarımın bir kuralı, coin ödülü ve iki dilde adı var', () => {
    const everything = earnedAchievements({
      stars: cleared(1, 90, 3),
      streak: 30,
      duelWins: 25,
      beatHard: true,
      cosmetics: 5,
      noUndoWins: 10,
      duelBlocks: 3,
    });
    expect([...everything].sort()).toEqual([...achievementIds].sort());
    for (const id of achievementIds) {
      expect(economy.achievements[id]).toBeGreaterThan(0);
      expect(tr[achievementTitleKey(id)]).toBeTruthy();
      expect(en[achievementTitleKey(id)]).toBeTruthy();
    }
  });

  it('Game Center kimlikleri benzersiz ve yalnızca harf, rakam, alt çizgi', () => {
    const ids = [...achievementIds.map((id: AchievementId) => gameCenterAchievementId(id)), ...Object.values(leaderboards)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9_]+$/);
  });
});
