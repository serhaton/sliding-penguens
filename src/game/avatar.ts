/**
 * Profil pengueni: oyuncunun seçtiği karakter ve taktığı kostümler. Cüzdandaki
 * `profile.equipped` haritasından kurulur (yuva → ürün kimliği; `character`
 * yuvası karakter kimliğidir). Sahip olunmayan bir ürün takılı görünmez.
 */
import type { Costume } from '@/components/penguin/types';
import { characters, type CharacterId } from '@/data/characters';
import { cosmetics, cosmeticSlots, getCosmetic } from '@/data/cosmetics';

export interface Avatar {
  character: CharacterId;
  costume: Costume;
}

export const DEFAULT_CHARACTER: CharacterId = 'piti';

/**
 * Oyuncunun sahip olduğu kostümler: coinle açtıkları (`bought`, cüzdandan) ve
 * satın aldığı paketlerin içinden çıkanlar (`entitlements`: mağaza ürün kimlikleri).
 */
export function ownedCosmetics(
  bought: Readonly<Record<string, number>>,
  entitlements: readonly string[] = [],
): ReadonlySet<string> {
  const owned = new Set(Object.keys(bought));
  for (const entry of cosmetics) {
    if (entry.exclusive && entitlements.includes(entry.exclusive)) owned.add(entry.id);
  }
  return owned;
}

export function avatarFrom(equipped: Readonly<Record<string, string>>, owned: ReadonlySet<string>): Avatar {
  const character =
    equipped.character && equipped.character in characters ? (equipped.character as CharacterId) : DEFAULT_CHARACTER;
  const costume: Record<string, string> = {};
  for (const { slot } of cosmeticSlots) {
    const entry = getCosmetic(equipped[slot]);
    if (entry && entry.slot === slot && owned.has(entry.id)) costume[slot] = entry.look;
  }
  return { character, costume: costume as Costume };
}

/** Düello tahtasında atkı takım rengini taşır: özel atkı orada takılmaz. */
export function withoutScarf(avatar: Avatar): Avatar {
  const { scarf: _scarf, ...costume } = avatar.costume;
  return { ...avatar, costume };
}
