/**
 * Bakiye formülü. Bakiye hiçbir yerde saklanmaz; her seferinde birleşik
 * veriden yeniden hesaplanır:
 *
 *   bakiye = bölümÖdülleri(stars) + günlükÖdüller(dailyClaims)
 *          + başarımÖdülleri(achievements) + düelloÖdülleri(duelRewards)
 *          + Σ adBonus + Σ purchases (iade edilenler hariç)
 *          − Σ spent − Σ kostüm bedelleri
 *
 * Bölüm, günlük, başarım ve düello coinleri sayaçta tutulmadığı için aynı ödül
 * iki cihazda kazanılsa bile bir kez sayılır.
 */
import { economy, type CpuDifficulty } from './economy.config';
import type { MergedState } from './types';

/** Bir bölümde `stars` yıldızla kazanılmış toplam coin (0 yıldız = oynanmamış). */
export function levelReward(stars: number): number {
  if (stars <= 0) return 0;
  const s = Math.min(3, Math.floor(stars));
  return economy.level.firstClear + s * economy.level.perStar + (s === 3 ? economy.level.threeStarBonus : 0);
}

export function levelRewards(stars: Record<string, number>): number {
  return Object.values(stars).reduce((sum, s) => sum + levelReward(s), 0);
}

// --- Günlük kayıt anahtarları ---

export const dailyPuzzleKey = (date: string) => `daily:${date}`;
/** `day`: 7 günlük döngüdeki gün (1–7). */
export const loginKey = (date: string, day: number) => `login:${date}:${day}`;

/**
 * Günlük ödüller. Aynı gün için iki cihaz farklı seri günü kaydetmiş olabilir
 * (biri çevrimdışıyken seriyi yanlış saymış olabilir): gün başına tek ödül
 * verilir, büyük olanı.
 */
export function dailyRewards(claims: readonly string[]): number {
  const puzzles = new Set<string>();
  const logins = new Map<string, number>();
  for (const claim of claims) {
    const [kind, date, day] = claim.split(':');
    if (!date) continue;
    if (kind === 'daily') puzzles.add(date);
    if (kind === 'login') {
      const index = Math.min(economy.loginStreak.length, Math.max(1, Number(day) || 1));
      logins.set(date, Math.max(logins.get(date) ?? 0, economy.loginStreak[index - 1]!));
    }
  }
  let total = puzzles.size * economy.dailyPuzzle;
  for (const reward of logins.values()) total += reward;
  return total;
}

export function achievementRewards(ids: readonly string[]): number {
  const table: Record<string, number> = economy.achievements;
  // Bilinmeyen kimlik (daha yeni bir sürümün başarımı) 0 sayılır.
  return [...new Set(ids)].reduce((sum, id) => sum + (table[id] ?? 0), 0);
}

// --- Düello ödül kimlikleri ---

export const cpuFirstWinKey = (difficulty: CpuDifficulty) => `cpu-${difficulty}-first-win`;
/** `n`: o günün kaçıncı ödüllü galibiyeti (1–dailyWinLimit). */
export const dailyDuelKey = (date: string, n: number) => `daily-duel-${date}-${n}`;

export function duelRewards(ids: readonly string[]): number {
  let total = 0;
  for (const id of new Set(ids)) {
    const cpu = /^cpu-(\w+)-first-win$/.exec(id);
    if (cpu) {
      total += (economy.duel.cpuFirstWin as Record<string, number>)[cpu[1]!] ?? 0;
      continue;
    }
    const daily = /^daily-duel-\d{4}-\d{2}-\d{2}-(\d+)$/.exec(id);
    if (daily && Number(daily[1]) >= 1 && Number(daily[1]) <= economy.duel.dailyWinLimit) {
      total += economy.duel.dailyWin;
    }
  }
  return total;
}

/** İade edilmemiş satın alımların coin toplamı. */
export function purchasedCoins(state: Pick<MergedState, 'purchases' | 'revoked'>): number {
  const revoked = new Set(state.revoked);
  return Object.entries(state.purchases).reduce((sum, [id, coins]) => (revoked.has(id) ? sum : sum + coins), 0);
}

export interface Balance {
  /** Gerçek bakiye. Çevrimdışı çift harcamada negatif olabilir (borç). */
  raw: number;
  /** Ekranda gösterilecek değer: max(0, raw). */
  display: number;
  /** Oynayarak kazanılanlar (bölüm + günlük + başarım + düello + reklam). */
  earned: number;
  /** Satın alınanlar (iadeler düşülmüş). */
  purchased: number;
  /** Harcananlar (tüketilenler + kostümler). */
  spent: number;
}

export function computeBalance(state: MergedState): Balance {
  const earned =
    levelRewards(state.stars) +
    dailyRewards(state.dailyClaims) +
    achievementRewards(state.achievements) +
    duelRewards(state.duelRewards) +
    state.adBonus;
  const purchased = purchasedCoins(state);
  const spent = state.spent + Object.values(state.cosmetics).reduce((sum, paid) => sum + paid, 0);
  const raw = earned + purchased - spent;
  return { raw, display: Math.max(0, raw), earned, purchased, spent };
}
