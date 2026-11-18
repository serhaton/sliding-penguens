/**
 * Renk dışındaki tasarım belirteçleri: yazı ölçeği, 8 pt boşluk ızgarası,
 * köşe yarıçapları, gölgeler ve animasyon süreleri.
 */
import type { TextStyle, ViewStyle } from 'react-native';

import { isTablet, s } from './device';

/**
 * Tek yazı tipi ailesi: Nunito. Dosyalar derleme sırasında uygulamaya gömülür
 * (app.json → expo-font eklentisi), bu yüzden açılışta yükleme beklemesi olmaz.
 * iOS'ta aile adı dosyanın PostScript adıdır.
 */
export const fonts = {
  semiBold: 'Nunito-SemiBold',
  bold: 'Nunito-Bold',
  extraBold: 'Nunito-ExtraBold',
  black: 'Nunito-Black',
} as const;

/** Net bir boyut ölçeği. "Az yazı, büyük yazı": gövde metni bile 17 pt. */
export const typography = {
  display: { fontFamily: fonts.black, fontSize: s(44), lineHeight: s(48), letterSpacing: -0.5 },
  title: { fontFamily: fonts.black, fontSize: s(30), lineHeight: s(36), letterSpacing: -0.3 },
  heading: { fontFamily: fonts.extraBold, fontSize: s(22), lineHeight: s(28) },
  button: { fontFamily: fonts.black, fontSize: s(24), lineHeight: s(30) },
  body: { fontFamily: fonts.bold, fontSize: s(17), lineHeight: s(24) },
  label: { fontFamily: fonts.extraBold, fontSize: s(15), lineHeight: s(20) },
  caption: { fontFamily: fonts.semiBold, fontSize: s(13), lineHeight: s(18) },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** 8 pt ızgara. Ara değer gerekiyorsa `xs` (4) kullan; başka sayı uydurma. */
export const spacing = {
  xs: s(4),
  sm: s(8),
  md: s(16),
  lg: s(24),
  xl: s(32),
  xxl: s(48),
  xxxl: s(64),
};

export const radii = {
  sm: s(12),
  md: s(20),
  lg: s(28),
  pill: 999,
};

/** Dokunma hedefi alt sınırı (Apple HIG: 44 pt). İkon butonlar 48 kullanır. */
export const hitTarget = s(48);

/**
 * Telefonda içerik bu genişliği aşmaz. iPad'de ekranlar bütün genişliği
 * kullanır (bkz. Screen); bu sınır yalnızca telefon içindir.
 */
export const maxContentWidth = 520;

/** Dar kalması gereken içerik (ayar listesi, form): iPad'de ortalanmış sütun. */
export const readableWidth = s(560);

/** Ekran kenar boşluğu: iPad'de daha ferah. */
export const screenPadding = isTablet ? s(40) : 24;

/** Çok hafif gölgeler. Renk temadan gelir, bu yüzden fonksiyon. */
export const shadows = {
  soft: (color: string): ViewStyle => ({
    shadowColor: color,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  }),
  lifted: (color: string): ViewStyle => ({
    shadowColor: color,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  }),
} as const;

/** Animasyon süreleri (ms) ve yay ayarları. */
export const motion = {
  fast: 120,
  /** Ekran geçişleri ve çoğu arayüz hareketi. */
  base: 250,
  slow: 400,
  /** Buton bırakılınca geri esneme. */
  springBouncy: { damping: 12, stiffness: 320, mass: 0.6 },
  /** Buton basılınca küçülme: hızlı ve sönümlü. */
  springSnappy: { damping: 20, stiffness: 500, mass: 0.5 },
  /** Basılı buton ölçeği. */
  pressScale: 0.94,
} as const;
