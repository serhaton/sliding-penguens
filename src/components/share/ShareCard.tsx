/**
 * Paylaşılabilir sonuç kartı: penguenli, sade bir görsel. Ekranda görünmez;
 * yalnızca PNG'ye çevrilmek için çizilir (bkz. services/share.ts).
 *
 * Kart her zaman gündüz renkleriyle çizilir: paylaşılan görsel, oyuncunun
 * temasından bağımsız olarak aynı ve aydınlık görünsün.
 */
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Penguin } from '@/components/penguin';
import { AppText } from '@/components/ui';
import type { CharacterId } from '@/data/characters';
import type { PenguinColor } from '@/engine';
import { useTranslation } from '@/i18n';
import type { CardRef } from '@/services/share';
import { dayColors, radii, spacing } from '@/theme';

/** Kartın ekrandaki (pt) boyutu; çıktı 1080 piksel genişliğe ölçeklenir. */
export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 450;
export const SHARE_CARD_ASPECT = SHARE_CARD_HEIGHT / SHARE_CARD_WIDTH;

export interface ShareCardProps {
  /** Görüntüsü alınacak kök görünüm. */
  cardRef: CardRef;
  /** Büyük başlık: "Bölüm 12" ya da "Düello". */
  title: string;
  /** Yıldızlar (bölüm sonucu). Verilmezse gösterilmez. */
  stars?: number;
  /** Yıldızların yerine büyük bir yazı (düello skoru: "3 – 1"). */
  headline?: string;
  /** Alt satır: "8 hamle" ya da "Kazandım!". */
  caption: string;
  character?: CharacterId;
  /** Penguenin atkı rengi (düelloda takım rengi). */
  color?: PenguinColor;
}

export function ShareCard({ cardRef, title, stars, headline, caption, character = 'piti', color }: ShareCardProps) {
  const { t } = useTranslation();
  const c = dayColors;

  return (
    // Ekranın dışında durur. `collapsable={false}`: yerel görünüm silinmesin,
    // yoksa görüntüsü alınamaz.
    <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View ref={cardRef} collapsable={false} style={[styles.card, { backgroundColor: c.bgTop }]}>
        {/* Kar tepesi: beyaz panel üstünde net dursun diye tek ve soluk */}
        <View style={[styles.hill, { backgroundColor: c.hillFar }]} />

        <AppText variant="heading" center color={c.text}>
          {t('app.name')}
        </AppText>

        <View style={styles.penguin}>
          <Penguin character={character} color={color} size={170} pose="dance" mood="excited" interactive={false} />
        </View>

        <View style={[styles.panel, { backgroundColor: c.surface }]}>
          <AppText variant="title" center color={c.text}>
            {title}
          </AppText>
          {stars !== undefined && (
            <View style={styles.stars}>
              {[1, 2, 3].map((n) => (
                <SymbolView
                  key={n}
                  name="star.fill"
                  size={n === 2 ? 44 : 36}
                  tintColor={n <= stars ? c.coin : c.surfaceSunken}
                />
              ))}
            </View>
          )}
          {headline !== undefined && (
            <AppText variant="display" center color={c.text}>
              {headline}
            </AppText>
          )}
          <AppText variant="label" center color={c.textMuted}>
            {caption}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  hill: {
    position: 'absolute',
    width: 620,
    height: 360,
    left: -130,
    bottom: -150,
    borderRadius: radii.pill,
  },
  penguin: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.sm },
  panel: {
    alignSelf: 'stretch',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  stars: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: spacing.sm },
});
