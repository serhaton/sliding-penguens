/**
 * Oyun sonu kartı. Düello bir seridir (üç oyun kazanan alır):
 *  - Seri sürerken: oyunun sonucu, seri skoru ve "Sonraki oyun" butonu. Yeni
 *    oyun başka bir tahtada başlar ve başlayan oyuncu değişir.
 *  - Seri bitince: düelloyu kimin kazandığı, (varsa) kazanılan coin ve tek
 *    buton: "Ana ekran".
 * Köşede küçük paylaş ikonu. Yüz yüze oyunda kart iki tanedir: biri alttaki,
 * biri (ters duran) üstteki oyuncu için.
 *
 * Kart sakin: yalnızca yumuşakça belirir (bölüm sonu kartıyla aynı dil).
 */
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CoinCounter } from '@/components/hud/CoinCounter';
import { ShareCard, SHARE_CARD_ASPECT } from '@/components/share/ShareCard';
import { AppText, BigButton, IconButton, PressableScale, ScrimBleed } from '@/components/ui';
import type { PenguinColor } from '@/engine';
import { useTranslation } from '@/i18n';
import { audio } from '@/services/audio';
import { shareCard, type ViewHandle } from '@/services/share';
import { penguinColors, radii, s, shadows, spacing, useTheme } from '@/theme';

export interface DuelCompleteProps {
  /** Başlık: "Kazandın!", "Mavi kazandı!", "Berabere", "Düelloyu kazandın!". */
  title: string;
  /** Seri skoru: alttaki ve üstteki oyuncunun kazandığı oyun sayısı. */
  series: readonly [number, number];
  /** Bu oyunda yuvaya giren penguen sayıları (alttaki, üstteki). */
  gameScore: readonly [number, number];
  colors: readonly [PenguinColor, PenguinColor];
  /** Seri bitti: "Sonraki oyun" yerine "Ana ekran". */
  finished: boolean;
  /** Kazanan takımın rengi (paylaşım kartındaki penguen); berabere ise verilmez. */
  winnerColor?: PenguinColor;
  /** Bu maçla kazanılan coin (yalnızca bilgisayara karşı galibiyette). */
  coins: number;
  /**
   * Yüz yüze oyun: kart iki kez gösterilir, biri ters. Her iki oyuncu da
   * sonucu kendi yönünden okur ve sonraki oyunu kendi tarafından başlatabilir.
   */
  faceToFace?: boolean;
  onNext: () => void;
  onHome: () => void;
}

export function DuelComplete({
  title,
  series,
  gameScore,
  colors: teamColors,
  winnerColor,
  coins,
  finished,
  faceToFace = false,
  onNext,
  onHome,
}: DuelCompleteProps) {
  const { t } = useTranslation();
  const cardRef = useRef<ViewHandle>(null);
  const [sharing, setSharing] = useState(false);
  const headline = `${series[0]} – ${series[1]}`;

  useEffect(() => {
    audio.play('win');
  }, []);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    await shareCard(cardRef, SHARE_CARD_ASPECT);
    setSharing(false);
  };

  const card = (withShare: boolean) => (
    <ResultCard
      title={title}
      series={series}
      gameScore={gameScore}
      teamColors={teamColors}
      coins={coins}
      finished={finished}
      compact={faceToFace}
      onShare={withShare ? share : undefined}
      sharing={sharing}
      onNext={onNext}
      onHome={onHome}
    />
  );

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[StyleSheet.absoluteFill, styles.scrim, faceToFace && styles.scrimFaceToFace]}
    >
      <ScrimBleed />
      <ShareCard cardRef={cardRef} title={t('duel.title')} headline={headline} caption={title} color={winnerColor} />
      {/* Yüz yüze oyunda üstteki oyuncu için ters duran ikinci bir kart. */}
      {faceToFace && <View style={styles.flipped}>{card(false)}</View>}
      {card(true)}
    </Animated.View>
  );
}

/** Tek bir sonuç kartı. `compact`: yüz yüze oyunda iki kart ekrana sığsın diye daha kısa. */
function ResultCard({
  title,
  series,
  gameScore,
  teamColors,
  coins,
  finished,
  compact,
  onShare,
  sharing,
  onNext,
  onHome,
}: {
  title: string;
  series: readonly [number, number];
  gameScore: readonly [number, number];
  teamColors: readonly [PenguinColor, PenguinColor];
  coins: number;
  finished: boolean;
  compact: boolean;
  /** Verilmezse paylaş ikonu görünmez. */
  onShare?: () => void;
  sharing: boolean;
  onNext: () => void;
  onHome: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const badge = compact ? styles.scoreBadgeCompact : styles.scoreBadge;

  return (
    <View style={[styles.card, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}>
      <AppText variant={compact ? 'heading' : 'title'} center>
        {title}
      </AppText>

      {onShare && (
        <View style={styles.share}>
          <PressableScale accessibilityLabel={t('level.share')} hitSlop={12} disabled={sharing} onPress={onShare}>
            <View style={[styles.shareCircle, { backgroundColor: colors.surfaceSunken }]}>
              <SymbolView name="square.and.arrow.up" size={s(18)} weight="bold" tintColor={colors.text} />
            </View>
          </PressableScale>
        </View>
      )}

      {/* Seri skoru (kazanılan oyunlar): iki takımın rengiyle */}
      <View style={styles.score} accessible accessibilityLabel={`${series[0]} – ${series[1]}`}>
        <View style={[badge, { backgroundColor: penguinColors[teamColors[0]].main }]}>
          <AppText variant={compact ? 'title' : 'display'} color={colors.onPrimary}>
            {series[0]}
          </AppText>
        </View>
        <AppText variant="title" muted>
          –
        </AppText>
        <View style={[badge, { backgroundColor: penguinColors[teamColors[1]].main }]}>
          <AppText variant={compact ? 'title' : 'display'} color={colors.onAccent}>
            {series[1]}
          </AppText>
        </View>
      </View>

      <AppText variant="caption" muted center>
        {t('duel.gameScore', { a: gameScore[0], b: gameScore[1] })}
      </AppText>

      {coins > 0 && (
        <View style={styles.coins}>
          <CoinCounter value={coins} prefix="+" from={0} delay={300} tone="plain" size="large" />
        </View>
      )}

      {finished ? (
        // Seri bitti: tek yol ana ekran.
        <BigButton title={t('level.home')} icon="house.fill" size="medium" onPress={onHome} />
      ) : (
        <View style={styles.actions}>
          <IconButton icon="house.fill" label={t('level.home')} onPress={onHome} size={s(56)} />
          <View style={styles.rematch}>
            <BigButton title={t('duel.next')} icon="play.fill" tone="accent" size="medium" onPress={onNext} />
          </View>
        </View>
      )}
    </View>
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
  share: { position: 'absolute', top: spacing.md, right: spacing.md },
  shareCircle: {
    width: s(40),
    height: s(40),
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  scrimFaceToFace: { justifyContent: 'space-evenly' },
  flipped: { width: '100%', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  scoreBadgeCompact: {
    width: s(60),
    height: s(60),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadge: {
    width: s(84),
    height: s(84),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coins: { alignItems: 'center', minHeight: s(44), justifyContent: 'center' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  rematch: { flex: 1 },
});
