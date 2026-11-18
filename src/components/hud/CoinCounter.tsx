/**
 * Coin göstergesi: altın para + sayı. Sayı değişince sıçramaz, hızlıca sayarak
 * yeni değere ulaşır ("coin sayacı artarak dolsun").
 *
 *   <CoinCounter />            cüzdan bakiyesi (ana ekran, harita, bölüm şeridi)
 *   <CoinCounter value={25} prefix="+" from={0} />   bölüm sonunda kazanılan
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useWallet } from '@/economy/wallet';
import { useTranslation } from '@/i18n';
import { penguinColors, radii, s, shadows, spacing, type TypographyVariant, useTheme } from '@/theme';

/**
 * `target` değerine doğru sayan sayı. `from` verilirse ilk gösterimde oradan
 * başlar; verilmezse ilk değer doğrudan gösterilir, yalnızca değişimler sayılır.
 */
export function useCountUp(target: number, options: { from?: number; ms?: number; delay?: number } = {}): number {
  const { from, ms = 700, delay = 0 } = options;
  const [shown, setShown] = useState(from ?? target);
  /** Ekranda en son görünen değer: yeni hedefe buradan devam edilir. */
  const last = useRef(from ?? target);

  useEffect(() => {
    const start = last.current;
    if (start === target) return;
    let frame = 0;
    let startedAt = 0;
    const tick = (now: number) => {
      if (!startedAt) startedAt = now + delay;
      const k = Math.min(1, Math.max(0, (now - startedAt) / ms));
      // Sona doğru yavaşlar.
      const value = Math.round(start + (target - start) * (1 - Math.pow(1 - k, 3)));
      last.current = value;
      setShown(value);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms, delay]);

  return shown;
}

/** Altın para: düz, iki tonlu bir daire. */
export function CoinIcon({ size = 20 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: Math.max(2, size * 0.14),
        backgroundColor: colors.coin,
        borderColor: penguinColors.yellow.dark,
      }}
    />
  );
}

export interface CoinCounterProps {
  /** Verilmezse cüzdan bakiyesi gösterilir. */
  value?: number;
  /** Sayının önüne yazılır (ör. '+'). */
  prefix?: string;
  /** İlk gösterimde bu değerden saymaya başla. */
  from?: number;
  /** Saymaya başlamadan önce bekleme (ms). */
  delay?: number;
  /** pill: yüzeyli hap (şeritlerde). plain: zeminsiz (kart içinde). */
  tone?: 'pill' | 'plain';
  size?: 'small' | 'large';
}

export function CoinCounter({ value, prefix = '', from, delay, tone = 'pill', size = 'small' }: CoinCounterProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { balance } = useWallet();
  const target = value ?? balance.display;
  const shown = useCountUp(target, { from, delay });
  const large = size === 'large';
  const variant: TypographyVariant = large ? 'title' : 'label';

  return (
    <View
      accessible
      accessibilityLabel={`${t('home.coins')}: ${prefix}${target}`}
      style={[
        styles.row,
        large && styles.rowLarge,
        tone === 'pill' && [styles.pill, shadows.soft(colors.shadow), { backgroundColor: colors.surface }],
      ]}
    >
      <CoinIcon size={large ? s(30) : s(18)} />
      {/* Rakamlar eşit genişlikte: sayarken yazı sağa sola oynamasın. */}
      <AppText variant={variant} style={styles.digits}>
        {prefix}
        {shown}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  rowLarge: { gap: spacing.sm },
  pill: {
    minHeight: s(36),
    paddingHorizontal: spacing.sm + spacing.xs,
    borderRadius: radii.pill,
  },
  digits: { fontVariant: ['tabular-nums'] },
});
