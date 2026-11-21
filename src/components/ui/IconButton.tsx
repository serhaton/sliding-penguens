/**
 * Yuvarlak ikon buton (köşe ikonları, geri, bölüm ekranındaki alt butonlar).
 * İkonlar iOS'un yerleşik SF Symbols setinden gelir: harici görsel yok.
 */
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { fonts, hitTarget, radii, s, shadows, useTheme } from '@/theme';

import { AppText } from './AppText';
import { PressableScale, type PressableScaleProps } from './PressableScale';

export interface IconButtonProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  icon: SymbolViewProps['name'];
  /** İkonun yerine çizilecek içerik (ör. oyuncunun penguen portresi); verilirse `icon` çizilmez. */
  children?: ReactNode;
  /** Ekran okuyucu için zorunlu: ikonun yazısı yok. */
  label: string;
  /** Sağ üstte küçük rozet (seri sayısı, kalan hak...). */
  badge?: string | number;
  size?: number;
  tint?: string;
  /** Soluk görünür ve dokunmaya kapalıdır. */
  disabled?: boolean;
}

export function IconButton({
  icon,
  children,
  label,
  badge,
  size = hitTarget,
  tint,
  disabled = false,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      disabled={disabled}
      style={disabled ? styles.disabled : undefined}
      {...rest}
    >
      <View
        style={[
          styles.circle,
          shadows.soft(colors.shadow),
          { width: size, height: size, backgroundColor: colors.surface },
        ]}
      >
        {children ?? (
          <SymbolView
            name={icon}
            size={size * 0.46}
            weight="bold"
            tintColor={tint ?? colors.text}
          />
        )}
      </View>
      {badge !== undefined && (
        <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.surface }]}>
          <AppText variant="caption" color={colors.onAccent} style={styles.badgeText}>
            {badge}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.4 },
  circle: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: s(22),
    height: s(22),
    paddingHorizontal: 5,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.black, fontSize: s(12), lineHeight: s(15) },
});
