/**
 * Kostümler: penguenin şapkası, saçı, gözlüğü ve atkısı. Hepsi yalnızca
 * görünümdür; hiçbiri oyunda avantaj sağlamaz.
 *
 * Çoğu coinle açılır. `exclusive` olanlar coinle alınamaz: gerçek parayla
 * satılan bir paketin içinden çıkar (bkz. data/products.ts).
 *
 * Yeni bir kostüm eklemek için: buraya bir satır, çizimini
 * components/penguin/costumes.tsx'e, adını çevirilere ekle. Ödenen coin
 * cüzdanda ürünle birlikte saklanır; fiyat sonradan değişse de eski alımlar etkilenmez.
 */
import type { Costume, Glasses, Hair, Hat, ScarfStyle } from '@/components/penguin/types';
import type { TranslationKey } from '@/i18n';

/** Penguenin üstündeki yuvalar. Her yuvada en fazla bir parça takılı olur. */
export type CosmeticSlot = keyof Costume;

export interface Cosmetic {
  /** Cüzdandaki ürün kimliği: yuva + ad (ör. 'hat.beanie'). */
  id: string;
  slot: CosmeticSlot;
  /** Çizimdeki karşılığı. */
  look: Hat | Hair | Glasses | ScarfStyle;
  nameKey: TranslationKey;
  /** Coin fiyatı. */
  price: number;
  /** Yalnızca bu mağaza paketiyle gelir (coinle alınamaz). */
  exclusive?: string;
}

const item = (slot: CosmeticSlot, look: Cosmetic['look'], price: number, exclusive?: string): Cosmetic => ({
  id: `${slot}.${look}`,
  slot,
  look,
  nameKey: `cosmetic.${look}` as TranslationKey,
  price,
  ...(exclusive ? { exclusive } : {}),
});

export const cosmetics: readonly Cosmetic[] = [
  // Şapkalar
  item('hat', 'beanie', 200),
  item('hat', 'cap', 350),
  item('hat', 'party', 450),
  item('hat', 'flowers', 600),
  item('hat', 'headphones', 700),
  item('hat', 'tophat', 800),
  item('hat', 'viking', 1000),
  item('hat', 'wizard', 1200),
  item('hat', 'crown', 1500),
  item('hat', 'explorer', 0, 'starter.pack'),
  // Saçlar
  item('hair', 'tuft', 150),
  item('hair', 'spiky', 300),
  item('hair', 'mohawk', 450),
  item('hair', 'pigtails', 500),
  item('hair', 'curls', 550),
  item('hair', 'pompadour', 700),
  // Gözlükler
  item('glasses', 'round', 300),
  item('glasses', 'monocle', 400),
  item('glasses', 'hearts', 500),
  item('glasses', 'shades', 600),
  item('glasses', 'goggles', 800),
  // Atkılar: en pahalısı gökkuşağı.
  item('scarf', 'candy', 900),
  item('scarf', 'gold', 1800),
  item('scarf', 'rainbow', 3000),
  item('scarf', 'aurora', 0, 'bundle.aurora'),
];

export const cosmeticSlots: readonly { slot: CosmeticSlot; titleKey: TranslationKey }[] = [
  { slot: 'hat', titleKey: 'profile.hat' },
  { slot: 'hair', titleKey: 'profile.hair' },
  { slot: 'glasses', titleKey: 'profile.glasses' },
  { slot: 'scarf', titleKey: 'profile.scarf' },
];

export function getCosmetic(id: string | undefined): Cosmetic | undefined {
  return id ? cosmetics.find((entry) => entry.id === id) : undefined;
}
