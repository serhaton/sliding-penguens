/**
 * Uygulamadaki tüm yazılar bu bileşenden geçer: tek yazı tipi ailesi, sabit
 * boyut ölçeği, tema rengi. Ekranlarda ham <Text> kullanma.
 */
import { Text, type TextProps } from 'react-native';

import { typography, useTheme, type TypographyVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  /** Verilmezse temanın ana metin rengi. */
  color?: string;
  muted?: boolean;
  center?: boolean;
}

export function AppText({
  variant = 'body',
  color,
  muted,
  center,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      // Sistem yazı boyutu büyütülünce düzen taşmasın diye üst sınır koyuyoruz.
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        typography[variant],
        { color: color ?? (muted ? colors.textMuted : colors.text) },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
