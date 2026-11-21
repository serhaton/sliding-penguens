/**
 * Şans çarkı: günde bir çevirme; istenirse bir ödüllü videoyla bir çevirme
 * daha, sonra o gün biter. Ödül çoğunlukla az coindir; seyrek olarak büyük bir
 * coin ödülü ya da bir kostüm çıkar (olasılıklar: economy.config.ts).
 *
 * Çark satın alınmaz ve coinle çevrilmez: yalnızca günlük hak ve isteğe bağlı
 * video. Ödül, çark dönmeye başlarken cüzdana yazılır (uygulama dönerken
 * kapatılırsa hak yanmaz, yeniden de çevrilemez); çark sonra o dilimde yavaşça durur.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { LuckyWheel, WHEEL_SEGMENT_ANGLE } from '@/components/daily/LuckyWheel';
import { CoinCounter, CoinIcon } from '@/components/hud/CoinCounter';
import { Penguin } from '@/components/penguin';
import { AppText, BigButton, IconButton, Screen } from '@/components/ui';
import type { Cosmetic } from '@/data/cosmetics';
import { economy } from '@/economy/economy.config';
import { WHEEL_ITEM_FALLBACK } from '@/economy/rewards';
import { useWallet, wallet } from '@/economy/wallet';
import { useAvatar, useOwnedCosmetics } from '@/game/useAvatar';
import { useToday } from '@/game/useDaily';
import { pickSegment, pickWheelCosmetic, wheelStatus, WHEEL_SEGMENTS, type WheelSegmentId } from '@/game/wheel';
import { useTranslation } from '@/i18n';
import { ads, useRewardedReady } from '@/services/ads';
import { audio } from '@/services/audio';
import { haptics } from '@/services/haptics';
import { isTablet, radii, s, shadows, spacing, useTheme } from '@/theme';

/** Çarkın dönme süresi (ms) ve durmadan önce attığı tam tur sayısı. */
const SPIN_MS = 7000;
const FULL_TURNS = 6;
const TAU = Math.PI * 2;

const indexOf = (id: WheelSegmentId) => WHEEL_SEGMENTS.findIndex((segment) => segment.id === id);

/** Bu ekranda az önce çıkan ödül. */
interface Prize {
  /** Kazanıldığı gün: gece yarısını geçen oturumda dünkü ödül ekranda kalmasın. */
  date: string;
  coins: number;
  /** Kostüm çıktıysa o kostüm. */
  cosmetic: Cosmetic | null;
}

export default function WheelScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const today = useToday();
  const avatar = useAvatar();
  const owned = useOwnedCosmetics();
  const { state, balance } = useWallet();
  const claims = state.dailyClaims;
  const status = wheelStatus(claims, today);
  const rewardedReady = useRewardedReady();

  const [phase, setPhase] = useState<'idle' | 'ad' | 'spinning'>('idle');
  const [won, setPrize] = useState<Prize | null>(null);
  const prize = won?.date === today ? won : null;
  /**
   * Çark dönerken üstteki coin sayacında görünen bakiye. Ödül dönmeye başlarken
   * cüzdana yazılır; sayaç sonucu ele vermesin diye eski bakiyede bekler ve
   * çark durunca yeni bakiyeye doğru sayar.
   */
  const [heldBalance, setHeldBalance] = useState<number | null>(null);
  /** Dönmekte olan çevirmenin ödülü: çark durunca gösterilir. */
  const pending = useRef<Prize | null>(null);

  // Bugün çevrildiyse çark son çıkan dilimde durur.
  const last = status.spins[status.spins.length - 1];
  const rotation = useSharedValue(last ? -indexOf(last.segmentId) * WHEEL_SEGMENT_ANGLE : 0);

  // İbre her dilim sınırını geçtiğinde tık sesi ve küçük bir titreşim.
  const tick = () => {
    audio.tick();
    haptics.select();
  };
  useAnimatedReaction(
    () => Math.floor(rotation.value / WHEEL_SEGMENT_ANGLE + 0.5),
    (now, before) => {
      if (before !== null && now !== before) scheduleOnRN(tick);
    },
  );

  const land = () => {
    const landed = pending.current;
    pending.current = null;
    setPrize(landed);
    setHeldBalance(null);
    setPhase('idle');
    haptics.success();
    audio.play(landed && (landed.cosmetic || landed.coins >= 100) ? 'win' : 'star');
  };

  const spin = async () => {
    const number = status.nextSpin;
    if (phase !== 'idle' || number === null) return;

    // İkinci çevirme: önce video; sonuna kadar izlenmediyse hak durur.
    if (number > 1) {
      setPhase('ad');
      const watched = await ads.showRewarded();
      if (!watched) {
        setPhase('idle');
        return;
      }
    }

    const segment = pickSegment(Math.random());
    const cosmetic = segment.id === 'item' ? pickWheelCosmetic(owned, Math.random()) : null;
    // Kostüm çıktı ama oyuncu hepsine sahip: yerine büyük bir coin ödülü.
    const fallback = segment.id === 'item' && !cosmetic;
    setHeldBalance(balance.display);
    const saved = await wallet().claimWheel(today, number, fallback ? WHEEL_ITEM_FALLBACK : segment.id, cosmetic?.id);
    if (!saved) {
      setHeldBalance(null);
      setPhase('idle');
      return;
    }

    pending.current = { date: today, coins: fallback ? economy.wheel.itemFallback : segment.coins, cosmetic };
    setPrize(null);
    setPhase('spinning');

    // Hedef: birkaç tam tur + o dilimin ibreye geldiği açı (dilimin tam ortası
    // değil, içinde rastgele bir yer: her seferinde aynı noktada durmasın).
    const jitter = (Math.random() - 0.5) * WHEEL_SEGMENT_ANGLE * 0.7;
    const wanted = (((-indexOf(segment.id) * WHEEL_SEGMENT_ANGLE + jitter) % TAU) + TAU) % TAU;
    const current = ((rotation.value % TAU) + TAU) % TAU;
    const target = rotation.value + FULL_TURNS * TAU + ((wanted - current + TAU) % TAU);
    // Hızlı başlar, uzun uzun yavaşlayarak durur.
    rotation.value = withTiming(target, { duration: SPIN_MS, easing: Easing.out(Easing.poly(4)) }, (finished) => {
      if (finished) scheduleOnRN(land);
    });
  };

  // Ekrandan çıkılırsa (ödül zaten kaydedildi) bekleyen sonuç atılır.
  useEffect(() => () => void (pending.current = null), []);

  // iPad'de çark ekranın asıl öğesi: genişliğin çoğunu kaplar, ama sonuç ve butona yer kalır.
  const wheelSize = isTablet
    ? Math.min(width * 0.8, height * 0.54)
    : Math.min(width - spacing.lg * 2, 360);
  const busy = phase !== 'idle';
  const canRetry = status.retryAvailable && rewardedReady;
  /** Ekrana yeniden girildiğinde: bugün kazanılan coinlerin toplamı. */
  const todayCoins = status.spins.reduce((sum, entry) => sum + entry.coins, 0);
  const wonItemToday = status.spins.some((entry) => entry.segmentId === 'item' && entry.coins === 0);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.side}>
          <IconButton icon="chevron.left" label={t('common.back')} disabled={phase === 'spinning'} onPress={() => router.back()} />
        </View>
        <AppText variant="heading" accessibilityRole="header">
          {t('wheel.title')}
        </AppText>
        {/* Bakiye: çark durunca kazanılan coin buraya sayarak eklenir. */}
        <View style={[styles.side, styles.right]}>
          <CoinCounter value={heldBalance ?? balance.display} />
        </View>
      </View>

      <View style={styles.body}>
        <View accessible accessibilityLabel={t('wheel.title')}>
          <LuckyWheel size={wheelSize} rotation={rotation} />
        </View>

        {/* Sonuç ya da durum */}
        <View style={styles.result}>
          {phase === 'spinning' ? (
            <AppText variant="heading" muted>
              {t('wheel.spinning')}
            </AppText>
          ) : prize ? (
            <Animated.View
              entering={ZoomIn.springify().damping(12)}
              style={[styles.prize, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}
            >
              {prize.cosmetic ? (
                <>
                  <Penguin
                    character={avatar.character}
                    costume={{ ...avatar.costume, [prize.cosmetic.slot]: prize.cosmetic.look }}
                    mood="excited"
                    size={s(84)}
                    interactive={false}
                  />
                  <View style={styles.prizeTexts}>
                    <AppText variant="heading">{t('wheel.wonItem', { name: t(prize.cosmetic.nameKey) })}</AppText>
                    <AppText variant="caption" muted>
                      {t('wheel.wonItemHint')}
                    </AppText>
                  </View>
                </>
              ) : (
                <>
                  <CoinIcon size={s(34)} />
                  <AppText variant="title">{t('wheel.wonCoins', { n: prize.coins })}</AppText>
                </>
              )}
            </Animated.View>
          ) : status.spins.length > 0 ? (
            <Animated.View entering={FadeIn} style={styles.today}>
              <AppText variant="label" muted>
                {t('wheel.today')}
              </AppText>
              <View style={styles.todayRow}>
                {todayCoins > 0 && (
                  <>
                    <CoinIcon size={s(20)} />
                    <AppText variant="heading">{t('wheel.wonCoins', { n: todayCoins })}</AppText>
                  </>
                )}
                {wonItemToday && <AppText variant="heading">{t('wheel.surprise')}</AppText>}
              </View>
            </Animated.View>
          ) : (
            <AppText muted center>
              {t('wheel.ready')}
            </AppText>
          )}
        </View>
      </View>

      <View style={styles.action}>
        {busy ? null : status.freeAvailable ? (
          <BigButton title={t('wheel.spin')} icon="arrow.triangle.2.circlepath" onPress={() => void spin()} />
        ) : canRetry ? (
          <BigButton
            title={t('wheel.again')}
            subtitle={t('offer.video')}
            icon="play.rectangle.fill"
            tone="accent"
            onPress={() => void spin()}
          />
        ) : (
          <>
            <AppText muted center>
              {t('wheel.tomorrow')}
            </AppText>
            <BigButton title={t('level.home')} icon="house.fill" size="medium" onPress={() => router.dismissTo('/')} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  result: { minHeight: s(104), alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  prize: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  prizeTexts: { flexShrink: 1, gap: 2 },
  today: { alignItems: 'center', gap: spacing.xs },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  action: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    minHeight: s(72),
    justifyContent: 'flex-end',
    ...(isTablet && { width: '72%', alignSelf: 'center', paddingHorizontal: 0 }),
  },
});
