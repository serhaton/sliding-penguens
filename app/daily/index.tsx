/**
 * Günlük sayfası: her gün yenilenen iki şey tek yerde.
 *   1. Günlük bulmaca — çözünce coin verir ve seriyi uzatır.
 *   2. Şans çarkı — günde bir çevirme (istenirse videoyla bir tane daha).
 * Kartlar bugünkü durumu gösterir: bekleyen şey vurgulu, bitmiş olan soluk.
 */
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { CoinCounter } from '@/components/hud/CoinCounter';
import { Penguin } from '@/components/penguin';
import { AppText, IconButton, PressableScale, Screen } from '@/components/ui';
import { economy } from '@/economy/economy.config';
import { useAvatar } from '@/game/useAvatar';
import { useDaily } from '@/game/useDaily';
import { useTranslation } from '@/i18n';
import { useRewardedReady } from '@/services/ads';
import { isTablet, radii, s, shadows, spacing, useTheme } from '@/theme';

export default function DailyHubScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const avatar = useAvatar();
  const daily = useDaily();
  const rewardedReady = useRewardedReady();

  const wheelWaiting = daily.wheel.freeAvailable || (daily.wheel.retryAvailable && rewardedReady);
  const wheelHint = daily.wheel.freeAvailable
    ? t('wheel.ready')
    : daily.wheel.retryAvailable && rewardedReady
      ? t('wheel.retryReady')
      : t('wheel.tomorrow');

  return (
    <Screen narrow>
      <View style={styles.header}>
        <View style={styles.side}>
          <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        </View>
        <AppText variant="heading" accessibilityRole="header">
          {t('daily.title')}
        </AppText>
        <View style={[styles.side, styles.right]}>
          <CoinCounter />
        </View>
      </View>

      <View style={styles.hero}>
        <Penguin
          character={avatar.character}
          costume={avatar.costume}
          mood={!daily.solved || wheelWaiting ? 'excited' : 'happy'}
          pose="wave"
          size={isTablet ? s(210) : 150}
        />
        {daily.streak > 0 && (
          <View style={[styles.streak, { backgroundColor: colors.surface }]}>
            <SymbolView name="flame.fill" size={s(18)} weight="bold" tintColor={colors.accent} />
            <AppText variant="label">{t('daily.streak', { n: daily.streak })}</AppText>
          </View>
        )}
      </View>

      <View style={styles.cards}>
        <DailyCard
          icon="puzzlepiece.fill"
          tint={colors.primary}
          title={t('home.daily')}
          hint={daily.solved ? t('daily.played') : t('daily.puzzleHint', { n: economy.dailyPuzzle })}
          waiting={!daily.solved}
          onPress={() => router.push('/daily/puzzle')}
        />
        <DailyCard
          icon="sparkles"
          tint={colors.accent}
          title={t('wheel.title')}
          hint={wheelHint}
          waiting={wheelWaiting}
          onPress={() => router.push('/daily/wheel')}
        />
      </View>
    </Screen>
  );
}

/** Günlük kartı: ikon, başlık ve bugünkü durum. Bekleyen kartın köşesinde nokta durur. */
function DailyCard({
  icon,
  tint,
  title,
  hint,
  waiting,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  tint: string;
  title: string;
  hint: string;
  /** Bugün yapılacak bir şey var mı? */
  waiting: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityLabel={`${title}, ${hint}`}
      onPress={onPress}
      style={[styles.card, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}
    >
      <View style={[styles.cardIcon, { backgroundColor: waiting ? tint : colors.surfaceSunken }]}>
        <SymbolView name={icon} size={s(28)} weight="bold" tintColor={waiting ? colors.onPrimary : colors.textMuted} />
      </View>
      <View style={styles.cardTexts}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      </View>
      {waiting && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
      <SymbolView name="chevron.right" size={s(20)} weight="bold" tintColor={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  cards: { gap: spacing.md, marginBottom: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  cardIcon: {
    width: s(56),
    height: s(56),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: { flex: 1, gap: 2 },
  dot: { width: s(10), height: s(10), borderRadius: s(5) },
});
