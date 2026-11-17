/**
 * Ekonominin bütün sayıları tek yerde. Ödül ya da fiyat ayarlamak için yalnızca
 * bu dosya değişir; hiçbir ekran ya da servis içinde sabit coin sayısı olmamalı.
 *
 * Dikkat: bölüm, günlük, başarım ve düello coinleri ayrı bir sayaçta tutulmaz,
 * her seferinde bu tablodan yeniden hesaplanır. Yani buradaki bir ödülü
 * değiştirmek, o ödülü daha önce kazanmış oyuncuların bakiyesini de değiştirir.
 */
export const economy = {
  /** Her bölümde ücretsiz geri alma hakkı. */
  freeUndosPerLevel: 3,

  // --- Kazanma ---
  level: {
    /** Bölümü ilk kez bitirme. */
    firstClear: 10,
    /** O bölümde ilk kez kazanılan her yıldız. */
    perStar: 5,
    /** İlk kez 3 yıldız. */
    threeStarBonus: 10,
  },
  /** Günlük bulmaca. */
  dailyPuzzle: 50,
  /** Günlük giriş serisi: 7 günlük döngü, 7. gün büyük ödül. */
  loginStreak: [10, 15, 20, 25, 30, 40, 100],
  duel: {
    /** Bilgisayara karşı her zorlukta ilk galibiyet. */
    cpuFirstWin: { easy: 30, medium: 60, hard: 120 },
    /** Günün ilk galibiyetleri için küçük ödül; günde en fazla bu kadar kez. */
    dailyWin: 15,
    dailyWinLimit: 3,
  },
  /** Başarımlar: tek seferlik ödüller. (Game Center kimlikleri 17. aşamada eşlenir.) */
  achievements: {
    'first-igloo': 20,
    'levels-10': 50,
    'levels-30': 100,
    'levels-60': 150,
    'levels-90': 250,
    'three-stars-10': 50,
    'three-stars-50': 200,
    'no-undo-10': 75,
    'turn-master': 100,
    'cracked-ice-master': 100,
    'sleepy-friend': 100,
    'streak-7': 100,
    'streak-30': 300,
    'first-duel-win': 50,
    'beat-hard-cpu': 150,
    'duel-wins-25': 200,
    'block-3': 75,
    'collector-5': 100,
  },

  // --- Harcama ---
  prices: {
    hint: 60,
    /** Ekstra geri alma paketi ve içindeki hak sayısı. */
    undoPack: 30,
    undoPackSize: 3,
  },

  // --- Satın alınabilir coin paketleri (StoreKit ürün kimliği → coin) ---
  coinPacks: {
    'coins.small': 500,
    'coins.medium': 1500,
    'coins.large': 4000,
    /** Başlangıç paketinin coin kısmı (reklamsız + kostüm ayrıca verilir). */
    'starter.pack': 1000,
  },
} as const;

export type AchievementId = keyof typeof economy.achievements;
export type CpuDifficulty = keyof typeof economy.duel.cpuFirstWin;
