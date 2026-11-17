/**
 * Günlük bulmaca, bulmaca serisi ve günlük giriş ödülü.
 *
 * Hepsi saf hesap: bugünün tarihi ve cüzdandaki `dailyClaims` kümesi verilir,
 * sonuç döner. Ayrı bir sayaç tutulmaz; seri de giriş günü de her seferinde
 * ödül kayıtlarından çıkarılır. Böylece iki cihazda oynayan oyuncunun serisi
 * iCloud birleşiminden sonra kendiliğinden doğru olur.
 *
 * Tarihler oyuncunun yerel günüdür ('YYYY-AA-GG', bkz. services/clock.ts).
 */
import puzzles from '@/data/daily/puzzles.json';
import { economy } from '@/economy/economy.config';
import { dailyPuzzleKey } from '@/economy/rewards';
import type { LevelDef } from '@/engine';

const POOL = puzzles as LevelDef[];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Tarihin gün numarası (1970-01-01 = 0). Saat dilimi ve yaz saati etkilemez. */
export function dayIndex(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Math.round(Date.UTC(year!, month! - 1, day!) / DAY_MS);
}

/** `date` gününden `days` gün sonrası (eksi olabilir). */
export function addDays(date: string, days: number): string {
  return new Date((dayIndex(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** Bulmacanın getirdiği mekanik: oyuncu henüz görmediyse önce tanıtımı oynar. */
function mechanicOf(level: LevelDef): string {
  if (level.penguins.some((p) => p.asleep)) return 'sleep';
  if (level.grid.some((row) => row.includes('+'))) return 'cracked';
  return 'turn';
}

/** Bu bölümlere ulaşan oyuncu ilgili mekaniği macerada görmüştür. */
const CRACKED_FROM = 31;
const SLEEP_FROM = 61;

/**
 * O günün bulmacası. Havuz tarihe göre sırayla gezilir ve bitince baştan döner;
 * aynı gün aynı ilerlemedeki herkes aynı bulmacayı görür.
 *
 * Oyuncu macerada henüz görmediği bir mekanikle karşılaşmaz: sıradaki bulmaca
 * çatlak buz ya da uyuyan penguen içeriyorsa ve oyuncu o maceraya gelmediyse,
 * aynı üçlünün daha erken (bildiği) bulmacası verilir. `reached`: oyuncunun
 * sıradaki bölüm numarası. Kimlik tarihi taşır: o güne ait harcamalar karışmasın.
 */
export function dailyPuzzleFor(date: string, reached = Infinity, pool: readonly LevelDef[] = POOL): LevelDef {
  let index = ((dayIndex(date) % pool.length) + pool.length) % pool.length;
  const known = (level: LevelDef) => {
    const mechanic = mechanicOf(level);
    return mechanic === 'turn' || (mechanic === 'cracked' ? reached >= CRACKED_FROM : reached >= SLEEP_FROM);
  };
  while (index > 0 && !known(pool[index]!)) index--;
  const level = pool[index]!;
  return { ...level, id: `daily-${date}`, intro: mechanicOf(level) };
}

/**
 * Bulmaca serisi: art arda çözülen gün sayısı. Bugün henüz çözülmediyse dünle
 * biten seri sayılır (gün bitene kadar bozulmaz); dün de yoksa 0.
 */
export function puzzleStreak(claims: readonly string[], today: string): number {
  const solved = new Set(claims);
  let day = solved.has(dailyPuzzleKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (solved.has(dailyPuzzleKey(day))) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export interface LoginStatus {
  /** 7 günlük döngüde bugünün günü (1–7). */
  day: number;
  /** O günün ödülü. */
  reward: number;
  /** Bugünün ödülü alındı mı? */
  claimed: boolean;
}

const loginDayOn = (claims: readonly string[], date: string): number | null => {
  const hit = claims.find((c) => c.startsWith(`login:${date}:`));
  return hit ? Number(hit.split(':')[2]) : null;
};

/**
 * Günlük giriş: dün ödül alındıysa döngü bir gün ilerler (7'den sonra 1'e
 * döner); bir gün atlanırsa 1'den başlar.
 */
export function loginStatus(claims: readonly string[], today: string): LoginStatus {
  const length = economy.loginStreak.length;
  const todays = loginDayOn(claims, today);
  const yesterdays = loginDayOn(claims, addDays(today, -1));
  const day = todays ?? (yesterdays !== null ? (yesterdays % length) + 1 : 1);
  return { day, reward: economy.loginStreak[day - 1]!, claimed: todays !== null };
}
