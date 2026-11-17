/**
 * Renk dışındaki tasarım belirteçleri: yazı ölçeği, 8 pt boşluk ızgarası,
 * köşe yarıçapları, gölgeler ve animasyon süreleri.
 */
import type { TextStyle, ViewStyle } from 'react-native';

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
  display: { fontFamily: fonts.black, fontSize: 44, lineHeight: 48, letterSpacing: -0.5 },
  title: { fontFamily: fonts.black, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28 },
  button: { fontFamily: fonts.black, fontSize: 24, lineHeight: 30 },
  body: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 },
  label: { fontFamily: fonts.extraBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** 8 pt ızgara. Ara değer gerekiyorsa `xs` (4) kullan; başka sayı uydurma. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

/** Dokunma hedefi alt sınırı (Apple HIG: 44 pt). İkon butonlar 48 kullanır. */
export const hitTarget = 48;

/** İçerik bu genişliği aşmaz; iPad'de ortalanmış kalır. */
export const maxContentWidth = 520;

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
