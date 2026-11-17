/**
 * Titreşim servisi. Ekranlar expo-haptics'i doğrudan çağırmaz; böylece
 * "Titreşim" ayarı tek yerden uygulanır ve desenler oyun genelinde tutarlı kalır.
 */
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/store/settings';

function enabled(): boolean {
  return useSettings.getState().haptics;
}

/** Titreşim asla oyunu bozmamalı: hata olursa sessizce yut. */
function run(effect: () => Promise<void>): void {
  if (!enabled()) return;
  effect().catch(() => {});
}

export const haptics = {
  /** Buton ve penguen dokunuşu: hafif. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Çarpma: orta. */
  bump: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Seçim değişimi (sekme, anahtar). */
  select: () => run(() => Haptics.selectionAsync()),
  /** Bölüm sonu, igloya giriş. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** "Hayır" (hareket edemeyen penguen). */
  nope: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
