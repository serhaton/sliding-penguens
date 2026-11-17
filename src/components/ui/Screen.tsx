/**
 * Her ekranın dış kabı: karlı zemin + güvenli alan boşlukları + iPad'de
 * ortalanmış, genişliği sınırlı içerik.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SnowBackground } from '@/components/SnowBackground';
import { maxContentWidth, spacing, useTheme } from '@/theme';

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bgBottom }]}>
      <SnowBackground />
      <View
        style={[
          styles.content,
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
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
});
