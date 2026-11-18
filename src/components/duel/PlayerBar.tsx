/**
 * Düello bilgi şeridi: oyuncunun pengueni, adı, yuvaya giren penguenleri ve
 * sıra göstergesi. Sırası gelen oyuncunun şeridi takım rengiyle çerçevelenir,
 * diğeri solar: kimin oynayacağı bir bakışta anlaşılır.
 *
 * Yüz yüze oyunda üstteki şerit ters çevrilir (`flipped`): karşıda oturan
 * oyuncu kendi şeridini düz görür.
 */
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

import { Penguin } from '@/components/penguin';
import { AppText, PressableScale } from '@/components/ui';
import type { PenguinColor } from '@/engine';
import type { Avatar } from '@/game/avatar';
import { useTranslation } from '@/i18n';
import { penguinColors, radii, s, shadows, spacing, useTheme } from '@/theme';

/** Tepki çıkartmaları: küçük, zararsız, yazısız. */
const REACTIONS = ['😀', '😮', '😅', '👏'] as const;
/** Tepki balonunun ekranda kalma süresi (ms). */
const REACTION_MS = 1800;

export interface PlayerBarProps {
  name: string;
  color: PenguinColor;
  /** Yuvadaki ve toplam penguen sayısı. */
  home: number;
  total: number;
  /** Seride kazanılan oyun sayısı: adın yanında kupalarla gösterilir. */
  wins?: number;
  /** Sıra bu oyuncuda. */
  active: boolean;
  /** Adın altındaki kısa not: "Sıra sende", "Düşünüyor…", "Pas". */
  note?: string;
  /** Oyuncunun profil pengueni (kostümleriyle). Verilmezse sade takım pengueni. */
  avatar?: Avatar;
  /** 180° çevrilmiş (yüz yüze oyunda üstteki oyuncu). */
  flipped?: boolean;
  /** Tepki butonu gösterilsin mi? (Bilgisayarın tepki butonu olmaz.) */
  canReact?: boolean;
}

export function PlayerBar({
  name,
  color,
  home,
  total,
  wins = 0,
  active,
  note,
  avatar,
  flipped = false,
  canReact = false,
}: PlayerBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tone = penguinColors[color];
  const [picking, setPicking] = useState(false);
  const [reaction, setReaction] = useState<{ emoji: string; id: number } | null>(null);

  // Tepki balonu kısa süre sonra kendiliğinden kaybolur.
  useEffect(() => {
    if (!reaction) return;
    const timer = setTimeout(() => setReaction(null), REACTION_MS);
    return () => clearTimeout(timer);
  }, [reaction]);

  const react = (emoji: string) => {
    setPicking(false);
    setReaction((r) => ({ emoji, id: (r?.id ?? 0) + 1 }));
  };

  return (
    <View style={flipped && styles.flipped}>
      <View
        accessible
        accessibilityLabel={`${name}, ${wins}, ${home} / ${total}${note ? `, ${note}` : ''}`}
        style={[
          styles.bar,
          shadows.soft(colors.shadow),
          { backgroundColor: colors.surface, borderColor: active ? tone.main : colors.surface },
          !active && styles.waiting,
        ]}
      >
        <View style={styles.avatar}>
          <Penguin
            character={avatar?.character}
            costume={avatar?.costume}
            color={color}
            size={s(44)}
            mood={active ? 'excited' : 'happy'}
            interactive={false}
          />
        </View>

        <View style={styles.texts}>
          <View style={styles.nameRow}>
            <AppText variant="label" numberOfLines={1}>
              {name}
            </AppText>
            {Array.from({ length: wins }, (_, i) => (
              <SymbolView key={i} name="trophy.fill" size={s(14)} tintColor={colors.coin} />
            ))}
          </View>
          <AppText variant="caption" color={active ? tone.dark : colors.textMuted} numberOfLines={1}>
            {note ?? ' '}
          </AppText>
        </View>

        {/* Yuvalar: giren her penguen bir noktayı doldurur. */}
        <View style={styles.pips}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                { borderColor: tone.main, backgroundColor: i < home ? tone.main : 'transparent' },
              ]}
            />
          ))}
        </View>

        {canReact && (
          <PressableScale accessibilityLabel={t('duel.reaction')} hitSlop={8} onPress={() => setPicking((p) => !p)}>
            <View style={[styles.reactButton, { backgroundColor: colors.surfaceSunken }]}>
              <AppText variant="label">🙂</AppText>
            </View>
          </PressableScale>
        )}
      </View>

      {/* Çıkartma seçici: şeridin üstünde açılır. */}
      {picking && (
        <Animated.View
          entering={ZoomIn.duration(140)}
          style={[styles.picker, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}
        >
          {REACTIONS.map((emoji) => (
            <PressableScale key={emoji} accessibilityLabel={emoji} hitSlop={4} onPress={() => react(emoji)}>
              <AppText variant="title">{emoji}</AppText>
            </PressableScale>
          ))}
        </Animated.View>
      )}

      {reaction && (
        <Animated.View
          key={reaction.id}
          pointerEvents="none"
          entering={ZoomIn.springify().damping(10).stiffness(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.bubble, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}
        >
          <AppText variant="display">{reaction.emoji}</AppText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flipped: { transform: [{ rotate: '180deg' }] },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
    minHeight: s(64),
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 3,
  },
  waiting: { opacity: 0.6 },
  avatar: { width: s(44), height: s(44) },
  texts: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pips: { flexDirection: 'row', gap: spacing.xs + 2 },
  pip: { width: s(18), height: s(18), borderRadius: 9, borderWidth: 3 },
  reactButton: {
    width: s(40),
    height: s(40),
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    position: 'absolute',
    right: 0,
    bottom: s(72),
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  bubble: {
    position: 'absolute',
    right: spacing.md,
    bottom: s(72),
    width: s(76),
    height: s(76),
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
