/**
 * Günlük bulmaca (Günlük sayfasından açılır). Her gün tarihe göre seçilen tek bir bulmaca. Günde bir kez
 * oynanır: çözünce ödül verilir ve seri bir gün uzar; o gün yeniden açılırsa
 * bulmaca yerine "bugünkünü oynadın" diyen üzgün penguen çıkar.
 */
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LevelPlay } from '@/components/level/LevelPlay';
import { Penguin } from '@/components/penguin';
import { AppText, BigButton, IconButton, Screen } from '@/components/ui';
import { economy } from '@/economy/economy.config';
import { dailyPuzzleKey } from '@/economy/rewards';
import { useWallet, wallet } from '@/economy/wallet';
import { dailyPuzzleFor, puzzleStreak } from '@/game/daily';
import { useProgress } from '@/game/progress';
import { useAvatar } from '@/game/useAvatar';
import { useToday } from '@/game/useDaily';
import { useTranslation } from '@/i18n';
import { radii, s, spacing, useTheme } from '@/theme';

export default function DailyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = useToday();
  const avatar = useAvatar();
  const claims = useWallet().state.dailyClaims;
  // Oyuncunun macerada geldiği yer: henüz görmediği mekanik günlük bulmacada çıkmaz.
  const reached = useProgress().currentNumber;
  const level = useMemo(() => dailyPuzzleFor(today, reached), [today, reached]);
  const solved = claims.includes(dailyPuzzleKey(today));
  /** Bu ekranda az önce çözülen gün: sonuç kartı dururken "oynadın" ekranına geçilmesin. */
  const [wonOn, setWonOn] = useState<string | null>(null);
  // Bu çözüşten sonraki seri: bugün sayılmış hâliyle.
  const streak = puzzleStreak(solved ? claims : [...claims, dailyPuzzleKey(today)], today);

  // Bugünkü bulmaca daha önce oynandı: ikinci oynayış yok.
  if (solved && wonOn !== today) {
    return (
      <Screen>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <View style={styles.center}>
          <Penguin character={avatar.character} costume={avatar.costume} mood="sad" size={s(170)} />
          <AppText variant="title" center>
            {t('daily.played')}
          </AppText>
          <AppText muted center>
            {t('daily.tomorrow')}
          </AppText>
          <View style={[styles.streak, { backgroundColor: colors.surface }]}>
            <SymbolView name="flame.fill" size={s(18)} weight="bold" tintColor={colors.accent} />
            <AppText variant="label">{t('daily.streak', { n: streak })}</AppText>
          </View>
        </View>
        <View style={styles.action}>
          <BigButton title={t('level.home')} icon="house.fill" size="medium" onPress={() => router.dismissTo('/')} />
        </View>
      </Screen>
    );
  }

  return (
    <LevelPlay
      // key: gece yarısını geçince yeni günün bulmacası sıfırdan kurulsun.
      key={level.id}
      level={level}
      title={t('home.daily')}
      rewardFor={() => (solved ? 0 : economy.dailyPuzzle)}
      onWin={() => {
        setWonOn(today);
        void wallet().claimDailyPuzzle(today);
      }}
      winNote={() => t('daily.streak', { n: streak })}
      replayable={false}
      hasNext={false}
      onNext={() => router.dismissTo('/')}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  action: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
});
