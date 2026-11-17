import type { SharedValue } from 'react-native-reanimated';

import type { CharacterId } from '@/data/characters';
import type { Direction, PenguinColor } from '@/engine/types';

/** Yüz ifadeleri. `sad` yalnızca düello kaybında, kısa ve tatlı. */
export type Mood = 'happy' | 'excited' | 'surprised' | 'oops' | 'sleepy' | 'proud' | 'sad';

/**
 * - idle: ayakta, kişiliğine göre boşta hareketler.
 * - slide: karnının üstünde, baktığı yöne kayıyor.
 * - sleep: uyuyor (uyuyan penguen mekaniği).
 * - wave: el sallıyor (igloo kapısında).
 * - dance: minik dans (bölüm sonu, uzun süre dokunulmayınca).
 */
export type Pose = 'idle' | 'slide' | 'sleep' | 'wave' | 'dance';

export type Hat =
  | 'beanie'
  | 'cap'
  | 'party'
  | 'flowers'
  | 'headphones'
  | 'tophat'
  | 'viking'
  | 'wizard'
  | 'crown'
  | 'explorer';
export type Hair = 'tuft' | 'spiky' | 'mohawk' | 'curls' | 'pigtails' | 'pompadour';
export type Glasses = 'round' | 'shades' | 'hearts' | 'monocle' | 'goggles';
/** Özel atkılar: takım/karakter renginin yerine renk geçişli atkı. */
export type ScarfStyle = 'rainbow' | 'candy' | 'gold' | 'aurora';

/** Kostüm katmanları. Her yuvada en fazla bir parça. */
export interface Costume {
  hat?: Hat;
  hair?: Hair;
  glasses?: Glasses;
  scarf?: ScarfStyle;
}

export interface PenguinLook {
  /** Karakter: rengi, kişiliği ve sembolü belirler. */
  character?: CharacterId;
  /** Atkı rengini ezer (düelloda takım rengi). */
  color?: PenguinColor;
  /** Baktığı yön. 'down' = bize bakıyor. */
  direction?: Direction;
  mood?: Mood;
  pose?: Pose;
  costume?: Costume;
  /** Atkıdaki renk körlüğü sembolü. */
  showSymbol?: boolean;
  largeSymbol?: boolean;
}

export interface PenguinSpriteProps extends PenguinLook {
  /** Sol üst köşe ve kenar uzunluğu (tuval koordinatlarında). */
  x?: number;
  y?: number;
  size: number;
  /** Dışarıdan sürülen zıplama (0–1): dokunma tepkisi. */
  hop?: SharedValue<number>;
  /** Ortak saat; verilmezse kendi saatini kurar. */
  clock?: SharedValue<number>;
}
