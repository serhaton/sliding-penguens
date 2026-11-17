/**
 * Cihaz belgelerini birleştirir. Saf fonksiyon: sıra önemli değildir
 * (değişmeli ve birleşmeli) ve aynı belgeyi iki kez vermek sonucu değiştirmez
 * — sayaçlar hariç: sayaçlar cihaz başınadır, o yüzden her cihaz TEK belgeyle
 * temsil edilmelidir (çağıran, cihaz anahtarına göre tekilleştirir).
 */
import type { DeviceDoc, DuelStats, MergedState, Profile } from './types';

const union = (lists: string[][]): string[] => [...new Set(lists.flat())].sort();

/** Anahtar bazında en büyük değer. */
function maxMap(maps: Record<string, number>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) out[key] = Math.max(out[key] ?? 0, value);
  }
  return out;
}

export function mergeDocs(docs: readonly DeviceDoc[]): MergedState {
  const duelStats: DuelStats = { wins: 0, draws: 0, losses: 0 };
  let profile: Profile = { equipped: {}, updatedAt: 0 };
  let adBonus = 0;
  let spent = 0;

  for (const doc of docs) {
    // Sayaçlar: bütün cihazların toplamı.
    adBonus += doc.adBonus;
    spent += doc.spent;
    duelStats.wins += doc.duelStats.wins;
    duelStats.draws += doc.duelStats.draws;
    duelStats.losses += doc.duelStats.losses;
    // Profil: en yeni kazanır. Eşitlikte belirlenimci olsun diye içerik karşılaştırılır.
    if (
      doc.profile.updatedAt > profile.updatedAt ||
      (doc.profile.updatedAt === profile.updatedAt &&
        JSON.stringify(doc.profile.equipped) > JSON.stringify(profile.equipped))
    ) {
      profile = doc.profile;
    }
  }

  return {
    // Yıldızlar: bölüm başına en yüksek.
    stars: maxMap(docs.map((d) => d.stars)),
    // Kümeler: birleşim.
    dailyClaims: union(docs.map((d) => d.dailyClaims)),
    achievements: union(docs.map((d) => d.achievements)),
    duelRewards: union(docs.map((d) => d.duelRewards)),
    revoked: union(docs.map((d) => d.revoked)),
    // Satın alımlar ve kostümler: kimliğe göre birleşim (aynı kimlik bir kez).
    purchases: maxMap(docs.map((d) => d.purchases)),
    cosmetics: maxMap(docs.map((d) => d.cosmetics)),
    adBonus,
    spent,
    duelStats,
    profile,
  };
}

/**
 * Aynı cihazın iki kopyasını (yerel + iCloud'daki kendi anahtarı) birleştirir.
 * Uygulama silinip yeniden yüklenince yerel veri boştur ama iCloud'daki kendi
 * belgemiz durur: sayaçlar tek cihaza ait olduğu için toplanmaz, büyüğü alınır.
 */
export function mergeOwnCopies(a: DeviceDoc, b: DeviceDoc): DeviceDoc {
  const merged = mergeDocs([a, b]);
  return {
    schemaVersion: Math.max(a.schemaVersion, b.schemaVersion),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    stars: merged.stars,
    dailyClaims: merged.dailyClaims,
    achievements: merged.achievements,
    duelRewards: merged.duelRewards,
    revoked: merged.revoked,
    purchases: merged.purchases,
    cosmetics: merged.cosmetics,
    adBonus: Math.max(a.adBonus, b.adBonus),
    spent: Math.max(a.spent, b.spent),
    duelStats: {
      wins: Math.max(a.duelStats.wins, b.duelStats.wins),
      draws: Math.max(a.duelStats.draws, b.duelStats.draws),
      losses: Math.max(a.duelStats.losses, b.duelStats.losses),
    },
    profile: merged.profile,
  };
}
