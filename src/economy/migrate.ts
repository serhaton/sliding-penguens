/**
 * Cihaz belgesini okuma ve şema sürümü yükseltme.
 *
 * iCloud'dan gelen veri güvenilmezdir: eski bir sürümden, daha yeni bir
 * sürümden ya da bozuk olabilir. Burada her alan tek tek doğrulanır; bozuk
 * alan boş sayılır, belgenin geri kalanı kurtarılır. Okuma asla hata fırlatmaz.
 *
 * Yeni şema sürümü eklerken: SCHEMA_VERSION'ı artır ve buraya
 * "eski → yeni" dönüşümünü ekle. Eski sürümdeki cihazlar yeni alanları
 * görmezden gelir (bilinmeyen alanlar okunmaz, kendi belgelerine de yazılmaz).
 */
import { emptyDoc, SCHEMA_VERSION, type DeviceDoc } from './types';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [];

const numberMap = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (isObject(v)) for (const [k, n] of Object.entries(v)) if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[k] = n;
  return out;
};

/** Metni cihaz belgesine çevirir. Tamamen okunamıyorsa null. */
export function parseDoc(text: string | null | undefined): DeviceDoc | null {
  if (!text) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw)) return null;

  const version = count(raw.schemaVersion);
  const doc = emptyDoc(count(raw.updatedAt));

  doc.stars = Object.fromEntries(
    Object.entries(numberMap(raw.stars)).map(([id, s]) => [id, Math.min(3, Math.floor(s))]),
  );
  doc.dailyClaims = strings(raw.dailyClaims);
  doc.achievements = strings(raw.achievements);
  doc.duelRewards = strings(raw.duelRewards);
  doc.adBonus = count(raw.adBonus);
  doc.purchases = numberMap(raw.purchases);
  doc.revoked = strings(raw.revoked);
  doc.spent = count(raw.spent);

  // v0 → v1: kostümler önce düz listeydi (ödenen coin `spent` içindeydi).
  // Haritaya çevrilir; bedeli zaten `spent`te sayıldığı için 0 yazılır.
  doc.cosmetics = Array.isArray(raw.cosmetics)
    ? Object.fromEntries(strings(raw.cosmetics).map((id) => [id, 0]))
    : numberMap(raw.cosmetics);

  if (isObject(raw.duelStats)) {
    doc.duelStats = {
      wins: count(raw.duelStats.wins),
      draws: count(raw.duelStats.draws),
      losses: count(raw.duelStats.losses),
    };
  }
  if (isObject(raw.profile)) {
    const equipped: Record<string, string> = {};
    if (isObject(raw.profile.equipped)) {
      for (const [slot, item] of Object.entries(raw.profile.equipped)) if (typeof item === 'string') equipped[slot] = item;
    }
    doc.profile = { equipped, updatedAt: count(raw.profile.updatedAt) };
  }

  // Daha yeni bir sürümün belgesi: tanıdığımız alanları okuduk; sürümü olduğu
  // gibi bırakırız ki kendi belgemize yazarken düşürmeyelim.
  doc.schemaVersion = Math.max(version, SCHEMA_VERSION);
  return doc;
}

export function serializeDoc(doc: DeviceDoc): string {
  return JSON.stringify(doc);
}

/** Metnin UTF-8 bayt uzunluğu (iCloud sınırları bayt cinsindendir). */
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** Belgenin iCloud'da kaplayacağı bayt. */
export function docBytes(doc: DeviceDoc): number {
  return utf8Bytes(serializeDoc(doc));
}
