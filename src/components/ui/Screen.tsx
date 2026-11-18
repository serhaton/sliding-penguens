/**
 * Her ekranın dış kabı: karlı zemin + güvenli alan boşlukları + iPad'de
 * bütün ekranı kullanan, ferah kenar boşluklu içerik.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SnowBackground } from '@/components/SnowBackground';
import { isTablet, maxContentWidth, readableWidth, screenPadding, spacing, useTheme } from '@/theme';

export function Screen({
  children,
  style,
  narrow = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** iPad'de ortalanmış dar sütun (ayar listesi gibi okunacak içerik). */
  narrow?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bgBottom }]}>
      <SnowBackground />
      <View
        style={[
          styles.content,
          narrow && isTablet && styles.narrow,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    // Telefonda sınırlı sütun; iPad'de ekranın tamamı.
    maxWidth: isTablet ? undefined : maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: screenPadding,
  },
  narrow: { maxWidth: readableWidth + screenPadding * 2 },
});
