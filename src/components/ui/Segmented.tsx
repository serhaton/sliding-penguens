/** Birkaç seçenekten birini seçmek için hap şeklinde kontrol (dil, tema, zorluk). */
import { StyleSheet, View } from 'react-native';

import { haptics } from '@/services/haptics';
import { radii, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export interface SegmentedProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            haptic={false}
            pressScale={0.96}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.select();
              onChange(option.value);
            }}
            style={[styles.option, selected && { backgroundColor: colors.primary }]}
          >
            <AppText
              variant="label"
              numberOfLines={1}
              color={selected ? colors.onPrimary : colors.textMuted}
            >
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
