/** Araya giren reklamın kuralı (saf hesap; sayılar services/ads.config.ts'te). */
import { adsConfig } from '@/services/ads.config';

export interface InterstitialContext {
  /** Az önce bitirilen macera bölümünün numarası. */
  levelNumber: number;
  /** Son reklamdan (ya da oturum başından) beri bitirilen bölüm sayısı, bu bölüm dahil. */
  levelsSinceLast: number;
  /** Son reklamdan beri geçen süre (ms); hiç gösterilmediyse Infinity. */
  msSinceLast: number;
  /** Oyuncu reklamsız mı (Reklamsız ya da Hoş Geldin Paketi)? */
  noAds: boolean;
}

export function shouldShowInterstitial(context: InterstitialContext): boolean {
  const rule = adsConfig.interstitial;
  if (context.noAds) return false;
  if (context.levelNumber <= rule.freeLevels) return false;
  if (context.levelsSinceLast < rule.everyLevels) return false;
  return context.msSinceLast >= rule.minGapMs;
}
