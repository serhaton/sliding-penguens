/** Üç yıldızlık gösterge: kazanılanlar altın, diğerleri soluk. */
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

export function StarBar({ stars, size = 18 }: { stars: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={`${stars} / 3`}>
      {[1, 2, 3].map((n) => (
        <SymbolView
          key={n}
          name="star.fill"
          size={size}
          tintColor={n <= stars ? colors.coin : colors.surfaceSunken}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2, alignItems: 'center' },
});
