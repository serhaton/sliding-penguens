/**
 * Günlük hediye kartı: 7 günlük döngü, 7. gün büyük ödül. Ana ekranda, günün
 * ilk açılışında bir kez çıkar; dışına dokununca kapanır (ödül o gün içinde
 * tekrar açıldığında yine alınabilir).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { AppText, BigButton, ScrimBleed } from '@/components/ui';
import { economy } from '@/economy/economy.config';
import type { LoginStatus } from '@/game/daily';
import { useTranslation } from '@/i18n';
import { radii, s, shadows, spacing, useTheme } from '@/theme';

import { CoinIcon } from './CoinCounter';

export interface LoginRewardProps {
  status: LoginStatus;
  /** Ödülü cüzdana yazar. */
  onClaim: () => Promise<unknown>;
  onClose: () => void;
}

export function LoginReward({ status, onClaim, onClose }: LoginRewardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    await onClaim();
    onClose();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFill, styles.scrim]}
    >
      <ScrimBleed />
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={t('common.close')} onPress={onClose} />
      <Animated.View
        entering={ZoomIn.duration(220)}
        style={[styles.card, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}
      >
        <AppText variant="title" center>
          {t('login.title')}
        </AppText>
        <AppText variant="caption" muted center>
          {t('login.hint')}
        </AppText>

        {/* Yedi gün: geçenler soluk, bugün vurgulu, 7. gün geniş. */}
        <View style={styles.days}>
          {economy.loginStreak.map((amount, i) => {
            const day = i + 1;
            const today = day === status.day;
            const past = day < status.day;
            return (
              <View
                key={day}
                accessible
                accessibilityLabel={`${t('login.day', { n: day })}, ${amount} ${t('home.coins')}`}
                style={[
                  styles.day,
                  day === economy.loginStreak.length && styles.lastDay,
                  { backgroundColor: today ? colors.primary : colors.surfaceSunken },
                  past && styles.past,
                ]}
              >
                <AppText variant="caption" color={today ? colors.onPrimary : colors.textMuted}>
                  {t('login.day', { n: day })}
                </AppText>
                <View style={styles.amount}>
                  <CoinIcon size={s(16)} />
                  <AppText variant="label" color={today ? colors.onPrimary : colors.text}>
                    {amount}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>

        <BigButton
          title={`${t('login.claim')}  +${status.reward}`}
          icon="gift.fill"
          size="medium"
          onPress={claim}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(13, 24, 48, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: s(360),
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  day: {
    width: '30%',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    gap: 2,
  },
  lastDay: { width: '94%' },
  past: { opacity: 0.45 },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
