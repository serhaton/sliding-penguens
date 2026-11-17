/**
 * Reklam servisi — şimdilik yalnızca arayüz ve geliştirme taklidi.
 *
 * Gerçek AdMob bağlantısı 16. aşamada gelecek; o zaman yalnızca bu dosyanın içi
 * değişecek, ekranlar aynı kalacak. Ekranlar reklam kütüphanesini doğrudan
 * çağırmaz.
 *
 * O güne kadar:
 *  - Yayın sürümünde ödüllü video "hazır değil" görünür: ona bağlı butonlar
 *    (ör. "2 katı") hiç gösterilmez. Kimseye izlemediği reklamın ödülü verilmez.
 *  - Geliştirme sürümünde kısa bir bekleme reklamı taklit eder; akış test
 *    edilebilsin diye ödül verilir.
 */

/** Taklit reklamın süresi (ms). */
const FAKE_AD_MS = 900;

export const ads = {
  /** Gösterilmeye hazır bir ödüllü video var mı? */
  rewardedReady(): boolean {
    return __DEV__;
  },

  /**
   * Ödüllü videoyu gösterir. Oyuncu sonuna kadar izlediyse `true` döner;
   * kapattıysa ya da reklam yüklenemediyse `false`. Asla hata fırlatmaz.
   */
  showRewarded(): Promise<boolean> {
    if (!__DEV__) return Promise.resolve(false);
    return new Promise((resolve) => setTimeout(() => resolve(true), FAKE_AD_MS));
  },
};
