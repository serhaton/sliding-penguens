/**
 * Penguen karakterleri. Her rengin bir adı, kişiliği ve sembolü var.
 *
 * - Kişilik, boşta animasyonları belirler (bkz. components/penguin/motion.ts).
 * - Sembol, renk körlüğü için rengin ikinci işaretidir: atkıda ve igloo
 *   bayrağında görünür.
 */
import type { PenguinColor } from '@/engine/types';
import type { Language } from '@/i18n/locale';

export type Personality =
  /** Etrafa bakınır. */
  | 'curious'
  /** Sabırsızca ayak vurur, hızlı nefes alır. */
  | 'hasty'
  /** Bakışlarını kaçırır, yanakları kızarır. */
  | 'shy'
  /** Sık sık kanat çırpar, yerinde zıplar. */
  | 'cheerful'
  /** Ağır ağır nefes alır, esner. */
  | 'sleepy'
  /** Göğsünü kabartır, çenesi yukarıda. */
  | 'proud';

export type SymbolKind = 'circle' | 'triangle' | 'heart' | 'star' | 'diamond' | 'square';

export type CharacterId = 'piti' | 'mandi' | 'nar' | 'limon' | 'nane' | 'erik';

export interface Character {
  id: CharacterId;
  color: PenguinColor;
  name: Record<Language, string>;
  personality: Personality;
  symbol: SymbolKind;
}

export const characters: Record<CharacterId, Character> = {
  piti: { id: 'piti', color: 'blue', name: { tr: 'Pıtı', en: 'Pip' }, personality: 'curious', symbol: 'circle' },
  mandi: { id: 'mandi', color: 'orange', name: { tr: 'Mandi', en: 'Tango' }, personality: 'hasty', symbol: 'triangle' },
  nar: { id: 'nar', color: 'red', name: { tr: 'Nar', en: 'Ruby' }, personality: 'shy', symbol: 'heart' },
  limon: { id: 'limon', color: 'yellow', name: { tr: 'Limon', en: 'Sunny' }, personality: 'cheerful', symbol: 'star' },
  nane: { id: 'nane', color: 'green', name: { tr: 'Nane', en: 'Minty' }, personality: 'sleepy', symbol: 'diamond' },
  erik: { id: 'erik', color: 'purple', name: { tr: 'Erik', en: 'Plum' }, personality: 'proud', symbol: 'square' },
};

export const characterList: readonly Character[] = Object.values(characters);

/** Bir rengin varsayılan karakteri (bölüm verisi karakter belirtmediyse). */
export function characterForColor(color: PenguinColor): Character {
  return characterList.find((c) => c.color === color)!;
}

/** Rengin sembolü: penguen de igloo da aynı sembolü taşır. */
export function symbolForColor(color: PenguinColor): SymbolKind {
  return characterForColor(color).symbol;
}
