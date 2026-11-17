/**
 * Bölüm içinde coin ya da ödüllü videoyla alınabilen yardımlar: ipucu ve ekstra
 * geri alma. Fiyatlar ekonomi ayarından gelir; burada yalnızca "ne alınır, kaça"
 * tanımı ve ödeme akışı vardır. Ekranlar cüzdanı ve reklamı doğrudan çağırmaz.
 */
import { economy } from '@/economy/economy.config';
import { wallet } from '@/economy/wallet';
import { ads } from '@/services/ads';

export type OfferKind = 'hint' | 'undo';
export type PayMethod = 'coins' | 'video';

export interface Offer {
  kind: OfferKind;
  /** Coin fiyatı. */
  price: number;
  /** Kaç adet verir (ipucu 1, geri alma paketi 3). */
  amount: number;
}

export const offers: Record<OfferKind, Offer> = {
  hint: { kind: 'hint', price: economy.prices.hint, amount: 1 },
  undo: { kind: 'undo', price: economy.prices.undoPack, amount: economy.prices.undoPackSize },
};

/** Bakiye bu teklife yetiyor mu? (Borçtaki oyuncu harcayamaz.) */
export function canAfford(balance: number, offer: Offer): boolean {
  return balance >= offer.price;
}

let purchaseCounter = 0;

/**
 * Teklifin bedelini alır. Ödeme tamamlandıysa `true` döner; çağıran ancak o
 * zaman yardımı verir. Coin yetmiyorsa ya da video sonuna kadar izlenmediyse
 * `false`. Her çağrı ayrı bir harcamadır (kimliği benzersizdir); çift dokunuşa
 * karşı korumayı ekran sağlar (ödeme sürerken butonlar kapalıdır).
 */
export async function payFor(offer: Offer, method: PayMethod, levelId: string): Promise<boolean> {
  if (method === 'video') return ads.showRewarded();
  purchaseCounter += 1;
  const spendId = `${offer.kind}:${levelId}:${Date.now()}:${purchaseCounter}`;
  return (await wallet().spend(spendId, offer.price, offer.kind)) === 'ok';
}
