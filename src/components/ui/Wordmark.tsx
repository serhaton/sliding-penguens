/**
 * Oyunun adı, her harfi ayrı bir penguen renginde ("Pengolo"). Ana ekranda ve
 * paylaşım kartında kullanılır; ikon sahnesi aynı renk dizisini kullanır.
 */
import { StyleSheet, type TextProps } from 'react-native';

import { penguinColors } from '@/theme';

import { AppText, type AppTextProps } from './AppText';

/** Harflerin sırayla aldığı renkler (yedinci harf başa döner). */
export const wordmarkColors = [
  penguinColors.blue.main,
  penguinColors.orange.main,
  penguinColors.red.main,
  '#FFB800',
  penguinColors.green.main,
  penguinColors.purple.main,
] as const;

export interface WordmarkProps extends Omit<TextProps, 'children'> {
  text: string;
  variant?: AppTextProps['variant'];
}

export function Wordmark({ text, variant = 'display', style, ...rest }: WordmarkProps) {
  return (
    // Ekran okuyucu adı harf harf değil, tek kelime olarak okur.
    <AppText variant={variant} center accessibilityLabel={text} style={[styles.shadow, style]} {...rest}>
      {[...text].map((letter, index) => (
        <AppText key={index} variant={variant} color={wordmarkColors[index % wordmarkColors.length]}>
          {letter}
        </AppText>
      ))}
    </AppText>
  );
}

const styles = StyleSheet.create({
  // Hafif gölge: açık ve koyu zeminde harfler zeminden ayrılsın.
  shadow: { textShadowColor: 'rgba(13, 24, 48, 0.18)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
});
