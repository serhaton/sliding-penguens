/**
 * Şans çarkı (saf hesaplar). Günde bir karşılıksız çevirme; istenirse bir
 * ödüllü videoyla bir çevirme daha. Dilimler ve olasılıklar
 * economy.config.ts'te; kayıtlar cüzdanın günlük kayıtlarında durur
 * ('wheel:2026-11-21:1:c50').
 */
import { cosmetics, type Cosmetic } from '@/data/cosmetics';
import { economy } from '@/economy/economy.config';
import { WHEEL_ITEM_FALLBACK, wheelCoins } from '@/economy/rewards';

export type WheelSegment = (typeof economy.wheel.segments)[number];
export type WheelSegmentId = WheelSegment['id'];

export const WHEEL_SEGMENTS: readonly WheelSegment[] = economy.wheel.segments;

/** Ağırlıklı seçim. `roll`: [0, 1) aralığında rastgele sayı. */
export function pickSegment(roll: number): WheelSegment {
  const total = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
  let left = Math.min(Math.max(roll, 0), 0.999999) * total;
  for (const segment of WHEEL_SEGMENTS) {
    left -= segment.weight;
    if (left < 0) return segment;
  }
  return WHEEL_SEGMENTS[0]!;
}

/**
 * Çarktan çıkabilecek kostüm: coinle satılan ve oyuncunun henüz sahip olmadığı
 * kostümlerden rastgele biri. Pakete özel kostümler çıkmaz. Hepsine sahipse `null`.
 */
export function pickWheelCosmetic(owned: ReadonlySet<string>, roll: number): Cosmetic | null {
  const pool = cosmetics.filter((item) => !item.exclusive && !owned.has(item.id));
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(Math.max(roll, 0) * pool.length))]!;
}

export interface WheelSpin {
  /** Günün kaçıncı çevirmesi (1 = karşılıksız, 2 = videoyla). */
  spin: number;
  /** Çıkan dilim; kostüm yerine coin verildiyse yine 'item' dilimi. */
  segmentId: WheelSegmentId;
  coins: number;
}

export interface WheelStatus {
  /** Bugün yapılan çevirmeler, sırayla. */
  spins: WheelSpin[];
  /** Karşılıksız çevirme duruyor mu? */
  freeAvailable: boolean;
  /** Videoyla ikinci çevirme hakkı duruyor mu (karşılıksız kullanıldıktan sonra)? */
  retryAvailable: boolean;
  /** Sıradaki çevirmenin numarası; hak kalmadıysa `null`. */
  nextSpin: number | null;
}

export function wheelStatus(claims: readonly string[], date: string): WheelStatus {
  const byNumber = new Map<number, WheelSpin>();
  for (const claim of claims) {
    const [kind, day, n, prize] = claim.split(':');
    if (kind !== 'wheel' || day !== date || !prize) continue;
    const spin = Number(n);
    if (!(spin >= 1 && spin <= economy.wheel.spinsPerDay)) continue;
    const coins = wheelCoins(prize);
    const known = WHEEL_SEGMENTS.find((segment) => segment.id === prize);
    const segmentId: WheelSegmentId = prize === WHEEL_ITEM_FALLBACK ? 'item' : (known?.id ?? 'c10');
    const before = byNumber.get(spin);
    // İki cihaz aynı çevirmeyi yaptıysa bakiyede sayılan (büyük olan) gösterilir.
    if (!before || coins > before.coins) byNumber.set(spin, { spin, segmentId, coins });
  }
  const spins = [...byNumber.values()].sort((a, b) => a.spin - b.spin);
  let nextSpin: number | null = null;
  for (let n = 1; n <= economy.wheel.spinsPerDay; n++) {
    if (!byNumber.has(n)) {
      nextSpin = n;
      break;
    }
  }
  return { spins, freeAvailable: nextSpin === 1, retryAvailable: nextSpin !== null && nextSpin > 1, nextSpin };
}
