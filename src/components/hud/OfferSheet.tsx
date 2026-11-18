/**
 * Yardım teklifi: ekranın altından açılan küçük kart. İpucu ya da ekstra geri
 * alma için iki yol sunar: coin ya da ödüllü video.
 *
 * Tek kart, iki buton; dışına dokununca kapanır. Coin yetmiyorsa coin butonu
 * soluk ve kapalıdır; video hazır değilse video butonu hiç görünmez.
 */
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, PressableScale, ScrimBleed } from '@/components/ui';
import { useWallet } from '@/economy/wallet';
import { canAfford, type Offer, type PayMethod } from '@/game/offers';
import { useTranslation } from '@/i18n';
import { radii, shadows, spacing, useTheme } from '@/theme';

import { CoinIcon } from './CoinCounter';

export interface OfferSheetProps {
  offer: Offer;
  /** Ödüllü video gösterilebilir mi? */
  videoReady: boolean;
  /** Ödemeyi yapar; tamamlandıysa `true` döner (kart o zaman kapanır). */
  onPay: (method: PayMethod) => Promise<boolean>;
  onClose: () => void;
}

export function OfferSheet({ offer, videoReady, onPay, onClose }: OfferSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { balance } = useWallet();
  /** Ödeme sürüyor: butonlar kapalı (çift dokunuş iki kez ödetmesin). */
  const [busy, setBusy] = useState(false);

  const affordable = canAfford(balance.raw, offer);
  const hint = offer.kind === 'hint';

  const pay = async (method: PayMethod) => {
    if (busy) return;
    setBusy(true);
    const paid = await onPay(method);
    setBusy(false);
    if (paid) onClose();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFill, styles.scrim]}
    >
      <ScrimBleed />
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={t('common.close')} onPress={onClose} />
      <Animated.View
        entering={SlideInDown.duration(220)}
        exiting={SlideOutDown.duration(180)}
        style={[
          styles.card,
          shadows.lifted(colors.shadow),
          { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
        ]}
      >
        <View style={styles.heading}>
          <SymbolView
            name={hint ? 'lightbulb.fill' : 'arrow.uturn.backward'}
            size={26}
            weight="bold"
            tintColor={colors.accent}
          />
          <View>
            <AppText variant="heading">{t(hint ? 'offer.hint' : 'offer.undo')}</AppText>
            <AppText variant="caption" muted>
              {hint ? t('offer.hintBody') : t('offer.undoBody', { n: offer.amount })}
            </AppText>
          </View>
        </View>

        <View style={styles.options}>
          <PressableScale
            accessibilityLabel={`${offer.price} ${t('home.coins')}`}
            accessibilityState={{ disabled: !affordable || busy }}
            disabled={!affordable || busy}
            onPress={() => pay('coins')}
            style={[styles.option, { backgroundColor: colors.primary }, (!affordable || busy) && styles.off]}
          >
            <CoinIcon size={24} />
            <AppText variant="button" color={colors.onPrimary}>
              {offer.price}
            </AppText>
          </PressableScale>

          {videoReady && (
            <PressableScale
              accessibilityLabel={t('offer.video')}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => pay('video')}
              style={[styles.option, { backgroundColor: colors.accent }, busy && styles.off]}
            >
              <SymbolView name="play.rectangle.fill" size={24} weight="bold" tintColor={colors.onAccent} />
              <AppText variant="label" color={colors.onAccent}>
                {t('offer.video')}
              </AppText>
            </PressableScale>
          )}
        </View>

        {!affordable && (
          <AppText variant="caption" muted center>
            {t('offer.noCoins')}
          </AppText>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(13, 24, 48, 0.35)', justifyContent: 'flex-end' },
  card: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  options: { flexDirection: 'row', gap: spacing.md },
  option: {
    flex: 1,
    minHeight: 60,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  off: { opacity: 0.4 },
});
