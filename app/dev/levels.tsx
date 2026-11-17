/**
 * Bölüm görüntüleyici (yalnızca geliştirme sürümü): bütün bölümler zorluk
 * ölçütleriyle listelenir; dokununca o bölüm açılır. Zorluk eğrisini birlikte
 * oynayıp ayarlamak için. Ayarlar → Geliştirici → Bölüm görüntüleyici.
 *
 * Ölçütler: P = penguen, par = en az hamle, E = başlangıçta engelli penguen,
 * Z = zorluk puanı. Dalgalı bölümlerde dalga sayısı ve toplam par gösterilir.
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, IconButton, PressableScale, Screen } from '@/components/ui';
import { levelSections } from '@/data/levels';
import { waveCount } from '@/engine';
import { measure } from '@/generator/metrics';
import { useTranslation } from '@/i18n';
import { radii, shadows, spacing, useTheme } from '@/theme';

export default function LevelsViewer() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const packs = useMemo(
    () =>
      levelSections.map((section) => ({
        title: `${t('map.episode', { n: section.episode })} · ${section.key} · ${t(section.titleKey)}`,
        first: section.first,
        // Dalgalı bölümlerde ölçüt dalga başınadır; kartta toplam gösterilir.
        // Büyük durum uzaylı bölümlerde ölçüm cihazı yormasın diye sınırlı.
        rows: section.levels.map((level) => ({
          level,
          metrics: waveCount(level) > 1 ? null : measure(level, 4000),
        })),
      })),
    [t],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <AppText variant="heading">{t('dev.levels')}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {packs.map((pack) => (
          <View key={pack.title} style={styles.pack}>
            <AppText variant="label" muted>
              {pack.title}
            </AppText>
            <View style={styles.grid}>
              {pack.rows.map(({ level, metrics }, index) => (
                <PressableScale
                  key={level.id}
                  onPress={() => router.push({ pathname: '/level/[id]', params: { id: level.id } })}
                  style={[styles.card, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}
                >
                  <AppText variant="heading">{pack.first + index}</AppText>
                  {waveCount(level) > 1 ? (
                    <>
                      <AppText variant="caption" muted>
                        {level.grid[0]!.length}×{level.grid.length}
                      </AppText>
                      <AppText variant="caption" muted>
                        {waveCount(level)} {t('dev.waves')}
                      </AppText>
                      <AppText variant="caption" color={colors.primary}>
                        par {level.par}
                      </AppText>
                    </>
                  ) : (
                    <>
                      <AppText variant="caption" muted>
                        {level.grid[0]!.length}×{level.grid.length} · P{metrics?.penguins ?? '?'}
                      </AppText>
                      <AppText variant="caption" muted>
                        par {metrics?.par ?? '?'} · E{metrics?.blocked ?? '?'}
                      </AppText>
                      <AppText variant="caption" color={colors.primary}>
                        Z {metrics?.difficulty.toFixed(1) ?? '—'}
                      </AppText>
                    </>
                  )}
                </PressableScale>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerSpacer: { width: 48 },
  list: { gap: spacing.lg, paddingBottom: spacing.xl },
  pack: { gap: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + spacing.xs,
  },
  card: {
    width: '30.5%',
    borderRadius: radii.md,
    padding: spacing.sm + spacing.xs,
    alignItems: 'center',
    gap: 1,
  },
});
