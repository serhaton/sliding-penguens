/**
 * Ana eylem butonu ("Oyna", "Düello", "Devam").
 *
 * Altındaki koyu şerit butona hafif bir kalınlık verir; oyun butonu hissi
 * yaratır ama düz ve temiz kalır. Bir ekranda en fazla iki tane kullan.
 */
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { radii, s, shadows, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { PressableScale, type PressableScaleProps } from './PressableScale';

export interface BigButtonProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  title: string;
  /** Başlığın altında küçük ikinci satır (ör. "Bölüm 12"). */
  subtitle?: string;
  icon?: SymbolViewProps['name'];
  /** primary: ana eylem (mavi). accent: ikinci eylem (turuncu). */
  tone?: 'primary' | 'accent';
  /** large: ekranın tek ana eylemi. medium: ikinci buton. */
  size?: 'large' | 'medium';
}

/** Alt şeridin yüksekliği. */
const LIP = s(6);

export function BigButton({
  title,
  subtitle,
  icon,
  tone = 'primary',
  size = 'large',
  ...rest
}: BigButtonProps) {
  const { colors } = useTheme();
  const face = tone === 'primary' ? colors.primary : colors.accent;
  const lip = tone === 'primary' ? colors.primaryDark : colors.accentDark;
  const text = tone === 'primary' ? colors.onPrimary : colors.onAccent;
  const large = size === 'large';

  return (
    <PressableScale
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      pressScale={0.96}
      style={[styles.lip, shadows.lifted(face), { backgroundColor: lip }]}
      {...rest}
    >
      <View
        style={[
          styles.face,
          { backgroundColor: face, minHeight: large ? s(80) : s(60) },
        ]}
      >
        {icon && (
          <SymbolView name={icon} size={large ? s(26) : s(22)} weight="heavy" tintColor={text} />
        )}
        <View style={styles.texts}>
          <AppText variant={large ? 'title' : 'button'} color={text}>
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="label" color={text} style={styles.subtitle}>
              {subtitle}
            </AppText>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  lip: {
    borderRadius: radii.lg,
    paddingBottom: LIP,
    alignSelf: 'stretch',
  },
  face: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + spacing.xs,
  },
  texts: { alignItems: 'center' },
  subtitle: { opacity: 0.85, marginTop: -2 },
});
