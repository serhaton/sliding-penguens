/**
 * Yeni başarım notu: ekranın üstünde kısa süre görünen küçük kart (başarımın
 * adı ve coin ödülü). Sırada birden fazla varsa art arda gösterilir.
 * Dokunuşları engellemez.
 */
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { economy } from '@/economy/economy.config';
import { achievementTitleKey } from '@/game/achievements';
import { useTranslation } from '@/i18n';
import { dismissAchievementToast, useAchievementToast } from '@/services/achievementSync';
import { audio } from '@/services/audio';
import { radii, shadows, spacing, useTheme } from '@/theme';

import { CoinIcon } from './CoinCounter';

/** Notun ekranda kalma süresi (ms). */
const SHOW_MS = 2800;

export function AchievementToast() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const id = useAchievementToast((s) => s.queue[0]);

  useEffect(() => {
    if (!id) return;
    audio.play('star');
    const timer = setTimeout(dismissAchievementToast, SHOW_MS);
    return () => clearTimeout(timer);
  }, [id]);

  if (!id) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <Animated.View
        key={id}
        entering={FadeInUp.duration(250)}
        exiting={FadeOutUp.duration(200)}
        accessibilityLiveRegion="polite"
        style={[styles.card, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}
      >
        <SymbolView name="trophy.fill" size={26} weight="bold" tintColor={colors.coin} />
        <View style={styles.texts}>
          <AppText variant="caption" muted>
            {t('achievement.unlocked')}
          </AppText>
          <AppText variant="label" numberOfLines={1}>
            {t(achievementTitleKey(id))}
          </AppText>
        </View>
        <View style={styles.reward}>
          <CoinIcon size={18} />
          <AppText variant="label">+{economy.achievements[id]}</AppText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 380,
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  texts: { flex: 1 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
