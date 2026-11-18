/**
 * Başarımlar: hangi koşulda kazanıldıkları (saf hesap) ve Game Center'daki
 * kimlikleri. Coin ödülleri economy.config.ts'te durur.
 *
 * Başarımlar ayrı bir sayaçla değil, oyuncunun durumundan (yıldızlar, seri,
 * düello istatistikleri, kostümler) çıkarılır; kazanılanlar cüzdandaki
 * `achievements` kümesine yazılır ve cihazlar arasında birleşir.
 */
import { economy, type AchievementId } from '@/economy/economy.config';
import type { TranslationKey } from '@/i18n';

export interface AchievementInput {
  /** Bölüm kimliği ("1"…"90") → en yüksek yıldız. */
  stars: Readonly<Record<string, number>>;
  /** Günlük bulmaca serisi. */
  streak: number;
  duelWins: number;
  /** Zor bilgisayar en az bir kez yenildi. */
  beatHard: boolean;
  /** Sahip olunan kostüm sayısı. */
  cosmetics: number;
  /** Geri al kullanmadan ilk kez bitirilen bölüm sayısı (bu cihazda). */
  noUndoWins: number;
  /** Düelloda rakibin pengueninin bizim penguene çarpıp durduğu kez (bu cihazda). */
  duelBlocks: number;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

/** Koşulu sağlanan bütün başarımlar (daha önce kazanılmış olanlar dahil). */
export function earnedAchievements(input: AchievementInput): AchievementId[] {
  const cleared = (id: string) => (input.stars[id] ?? 0) > 0;
  const clearedCount = Object.values(input.stars).filter((s) => s > 0).length;
  const perfect = Object.values(input.stars).filter((s) => s >= 3).length;
  const all = (from: number, to: number) => range(from, to).every(cleared);

  const rules: Record<AchievementId, boolean> = {
    'first-igloo': clearedCount >= 1,
    'levels-10': clearedCount >= 10,
    'levels-30': clearedCount >= 30,
    'levels-60': clearedCount >= 60,
    'levels-90': clearedCount >= 90,
    'three-stars-10': perfect >= 10,
    'three-stars-50': perfect >= 50,
    'no-undo-10': input.noUndoWins >= 10,
    // "Çarpınca dön" bölgesinin tamamı.
    'turn-master': all(11, 20),
    // Çatlak Buz macerasının tamamı.
    'cracked-ice-master': all(31, 60),
    // Uyuyan Penguen macerasının tamamı.
    'sleepy-friend': all(61, 90),
    'streak-7': input.streak >= 7,
    'streak-30': input.streak >= 30,
    'first-duel-win': input.duelWins >= 1,
    'beat-hard-cpu': input.beatHard,
    'duel-wins-25': input.duelWins >= 25,
    'block-3': input.duelBlocks >= 3,
    'collector-5': input.cosmetics >= 5,
  };
  return (Object.keys(rules) as AchievementId[]).filter((id) => rules[id]);
}

/** Bütün başarımlar, gösterim sırasıyla. */
export const achievementIds = Object.keys(economy.achievements) as AchievementId[];

export const achievementTitleKey = (id: AchievementId) => `achievement.${id}` as TranslationKey;

/** Game Center başarım kimliği (App Store Connect'te bu adla tanımlanır). */
export const gameCenterAchievementId = (id: AchievementId) => `sp_ach_${id.replaceAll('-', '_')}`;

/** Game Center liderlik tabloları. */
export const leaderboards = {
  totalStars: 'sp_lb_total_stars',
  dailyStreak: 'sp_lb_daily_streak',
  hardCpuWins: 'sp_lb_hard_cpu_wins',
} as const;
