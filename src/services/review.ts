/**
 * App Store puanlama isteği (Apple'ın kendi penceresi).
 *
 * Ne zaman sorulacağı game/reviewPolicy.ts'te; burada yalnızca pencere açılır
 * ve kaç kez sorulduğu cihazda tutulur. Pencereyi gösterip göstermemeye Apple
 * karar verir; TestFlight sürümünde hiç çıkmaz.
 */
import * as StoreReview from 'expo-store-review';

import { shouldAskForReview } from '@/game/reviewPolicy';

import { devFlags } from './devFlags';
import { kv } from './storage';

const ASKED_KEY = 'review.asked';

export const review = {
  /** Kural tutuyorsa pencereyi ister; istendiyse `true` döner. */
  async maybeAsk(levelNumber: number, stars: number): Promise<boolean> {
    if (devFlags.quiet) return false;
    const asked = kv.getNumber(ASKED_KEY) ?? 0;
    if (!shouldAskForReview({ levelNumber, stars, asked })) return false;
    try {
      if (!(await StoreReview.isAvailableAsync())) return false;
      kv.set(ASKED_KEY, asked + 1);
      await StoreReview.requestReview();
      return true;
    } catch {
      return false;
    }
  },
};
