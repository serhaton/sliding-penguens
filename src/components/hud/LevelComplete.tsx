/**
 * Bölüm sonu kartı: yıldızlar sırayla düşer, kazanılan coin sayarak dolar.
 * Tek ana buton "Devam"; yanında küçük "Tekrar oyna", altında "2 katı"
 * (ödüllü video), köşede küçük "Paylaş" ikonu.
 *
 * Kartın kendisi sakin: yalnızca yumuşakça belirir, zıplamaz ya da kaymaz
 * (gözü yoruyordu). Hareket yalnızca yıldızlarda ve coin sayacında.
 */
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { ShareCard, SHARE_CARD_ASPECT } from '@/components/share/ShareCard';
import { AppText, BigButton, IconButton, PressableScale } from '@/components/ui';
import type { CharacterId } from '@/data/characters';
import { useTranslation } from '@/i18n';
import { audio } from '@/services/audio';
import { haptics } from '@/services/haptics';
import { shareCard, type ViewHandle } from '@/services/share';
import { radii, shadows, spacing, useTheme } from '@/theme';

import { CoinCounter } from './CoinCounter';

export interface LevelCompleteProps {
  levelNumber: number;
  stars: number;
  moveCount: number;
  /** Bu sonuçla kazanılan coin. 0 ise (bölüm tekrar oynandıysa) sayaç gösterilmez. */
  coins: number;
  /** Paylaşım kartındaki penguen. */
  character?: CharacterId;
  /** Sıradaki bölüm var mı? Yoksa buton ana ekrana döner. */
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  /**
   * "2 katı": ödüllü videoyu gösterir ve ödülü cüzdana yazar; coin verildiyse
   * `true` döner. Verilmezse (reklam hazır değilse) buton hiç görünmez.
   */
  onDouble?: () => Promise<boolean>;
  /** Yalnızca geliştirme: kart açılınca paylaşım menüsünü kendiliğinden aç. */
  autoShare?: boolean;
}

const STAR_DELAY_MS = 280;
const FIRST_STAR_MS = 300;

export function LevelComplete({
  levelNumber,
  stars,
  moveCount,
  coins,
  character,
  hasNext,
  onNext,
  onReplay,
  onDouble,
  autoShare = false,
}: LevelCompleteProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cardRef = useRef<ViewHandle>(null);
  /** idle: buton görünür · busy: video oynuyor · done: coin ikiye katlandı. */
  const [double, setDouble] = useState<'idle' | 'busy' | 'done'>('idle');
  const [sharing, setSharing] = useState(false);

  // Coin sayacı son yıldızdan sonra saymaya başlar.
  const coinDelay = FIRST_STAR_MS + stars * STAR_DELAY_MS;

  // Her yıldız düşerken bir çan ve hafif titreşim.
  useEffect(() => {
    audio.play('win');
    const timers = Array.from({ length: stars }, (_, i) =>
      setTimeout(() => {
        audio.play('star');
        haptics.tap();
      }, FIRST_STAR_MS + i * STAR_DELAY_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [stars]);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    await shareCard(cardRef, SHARE_CARD_ASPECT);
    setSharing(false);
  };

  useEffect(() => {
    if (!autoShare) return;
    // Kartın (ve içindeki penguenin) çizilmesi için kısa bir bekleme.
    const timer = setTimeout(() => void shareCard(cardRef, SHARE_CARD_ASPECT), 1200);
    return () => clearTimeout(timer);
  }, [autoShare]);

  const watchAndDouble = async () => {
    if (!onDouble || double !== 'idle') return;
    setDouble('busy');
    const granted = await onDouble();
    setDouble(granted ? 'done' : 'idle');
    if (granted) {
      audio.play('star');
      haptics.success();
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.scrim]}>
      <ShareCard cardRef={cardRef} levelNumber={levelNumber} stars={stars} moveCount={moveCount} character={character} />

      <View style={[styles.card, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}>
        <AppText variant="title" center>
          {t('level.complete')}
        </AppText>

        {/* Küçük paylaş ikonu: kartın köşesinde, dikkat dağıtmaz. */}
        <View style={styles.share}>
          <PressableScale accessibilityLabel={t('level.share')} hitSlop={12} disabled={sharing} onPress={share}>
            <View style={[styles.shareCircle, { backgroundColor: colors.surfaceSunken }]}>
              <SymbolView name="square.and.arrow.up" size={18} weight="bold" tintColor={colors.text} />
            </View>
          </PressableScale>
        </View>

        <View style={styles.stars}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={n === 2 && styles.middleStar}>
              <SymbolView name="star.fill" size={56} tintColor={colors.surfaceSunken} />
              {n <= stars && (
                <Animated.View
                  entering={ZoomIn.delay(FIRST_STAR_MS + (n - 1) * STAR_DELAY_MS)
                    .springify()
                    .damping(11)
                    .stiffness(180)}
                  style={StyleSheet.absoluteFill}
                >
                  <SymbolView name="star.fill" size={56} tintColor={colors.coin} />
                </Animated.View>
              )}
            </View>
          ))}
        </View>

        <AppText muted center>
          {t('level.completeMoves', { n: moveCount })}
        </AppText>

        {coins > 0 && (
          <View style={styles.coins}>
            <CoinCounter
              value={double === 'done' ? coins * 2 : coins}
              prefix="+"
              from={0}
              delay={double === 'done' ? 0 : coinDelay}
              tone="plain"
              size="large"
            />
            {onDouble && double !== 'done' && (
              <PressableScale
                accessibilityLabel={t('level.doubleHint')}
                disabled={double === 'busy'}
                onPress={watchAndDouble}
                style={[styles.double, { backgroundColor: colors.accent }, double === 'busy' && styles.busy]}
              >
                <SymbolView name="play.rectangle.fill" size={20} weight="bold" tintColor={colors.onAccent} />
                <AppText variant="label" color={colors.onAccent}>
                  {t('level.double')}
                </AppText>
              </PressableScale>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <IconButton icon="arrow.counterclockwise" label={t('level.replay')} onPress={onReplay} size={56} />
          <View style={styles.next}>
            <BigButton
              title={hasNext ? t('level.next') : t('level.home')}
              icon={hasNext ? 'play.fill' : 'house.fill'}
              size="medium"
              onPress={onNext}
            />
          </View>
        </View>
      </View>
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
    maxWidth: 360,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  share: { position: 'absolute', top: spacing.md, right: spacing.md },
  shareCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  middleStar: { marginBottom: spacing.md },
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  double: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  busy: { opacity: 0.5 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  next: { flex: 1 },
});
