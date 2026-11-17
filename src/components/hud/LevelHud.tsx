/**
 * Bölüm ekranının üst bilgi şeridi: geri, bölüm adı, yıldız göstergesi ve
 * hamle / hedef, altında coin bakiyesi. İnce ve sakin: dikkat tahtada kalmalı.
 */
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { radii, shadows, spacing, useTheme } from '@/theme';

import { CoinCounter } from './CoinCounter';
import { StarBar } from './StarBar';

export interface LevelHudProps {
  levelNumber: number;
  moveCount: number;
  par: number;
  stars: number;
  /** Dalgalı bölümlerde: şu anki dalga (0'dan başlar) ve toplam dalga. */
  wave?: number;
  waves?: number;
  onBack: () => void;
}

export function LevelHud({ levelNumber, moveCount, par, stars, wave = 0, waves = 1, onBack }: LevelHudProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {/* Yan sütunlar eşit genişlikte: başlık tam ortada kalır. */}
      <View style={styles.side}>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={onBack} />
      </View>
      <View style={styles.title}>
        <AppText variant="heading" accessibilityRole="header">
          {t('level.title', { n: levelNumber })}
        </AppText>
        {/* Dalga göstergesi: biten dalgalar dolu, sıradakiler boş nokta. */}
        {waves > 1 && (
          <View style={styles.dots} accessibilityLabel={`${wave + 1} / ${waves}`}>
            {Array.from({ length: waves }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i < wave ? colors.primary : colors.surfaceSunken },
                  i === wave && { backgroundColor: colors.accent, width: 18 },
                ]}
              />
            ))}
          </View>
        )}
      </View>
      <View style={[styles.side, styles.right]}>
        <View
          style={[styles.pill, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}
          accessibilityLabel={`${t('level.moves')}: ${moveCount} / ${par}`}
        >
          <StarBar stars={stars} size={14} />
          <AppText variant="label">
            {moveCount}
            <AppText variant="label" muted>
              {' '}/ {par}
            </AppText>
          </AppText>
        </View>
        <CoinCounter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  side: { flex: 1, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end', gap: spacing.sm },
  title: { alignItems: 'center', gap: spacing.xs, minHeight: 48, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: radii.pill },
  pill: {
    minWidth: 64,
    minHeight: 48,
    paddingHorizontal: spacing.sm + spacing.xs,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
