/**
 * Reklam ayarları: reklam birimi kimlikleri ve araya giren reklamın kuralları.
 * Sıklığı ayarlamak için yalnızca bu dosya değişir.
 *
 * Tasarım kuralları: banner yok, açılış reklamı yok. Ödüllü video her zaman
 * oyuncunun isteğiyle açılır. Araya giren reklam yalnızca macera bölümleri
 * arasında, seyrek çıkar; düelloda ve günlük bulmacada hiç çıkmaz.
 */
export const adsConfig = {
  /** AdMob reklam birimleri (iOS). */
  units: {
    rewarded: 'ca-app-pub-4475107857161348/5702326651',
    interstitial: 'ca-app-pub-4475107857161348/7346580814',
  },
  /** Geliştirme sürümünde Google'ın test birimleri kullanılır: gerçek reklama yanlışlıkla tıklanmasın. */
  testUnits: {
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
  /** İzin soruları ve reklam yüklemesi bu bölüm bitince başlar (ilk açılışta soru sorulmaz). */
  startAfterLevel: 3,
  interstitial: {
    /** İlk bu kadar bölümde araya reklam girmez. */
    freeLevels: 10,
    /** En az bu kadar bölüm bitirildikten sonra bir reklam. */
    everyLevels: 3,
    /** İki reklam arasında en az bu kadar süre (ms). */
    minGapMs: 90_000,
  },
} as const;
