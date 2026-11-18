/**
 * Ayarlar: cihaza özel tercihler (dil, tema, ses, titreşim, semboller), iCloud
 * yedekleme durumu ve Game Center girişi.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText, IconButton, PressableScale, Screen, Segmented } from '@/components/ui';
import { useWallet } from '@/economy/wallet';
import { useTranslation } from '@/i18n';
import { gameCenter, useGameCenter } from '@/services/gameCenter';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/store/settings';
import { radii, s, shadows, spacing, useTheme } from '@/theme';

/** Beyaz, yuvarlak köşeli ayar kartı. */
function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onToggle,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTexts}>
        <AppText>{label}</AppText>
        {hint && (
          <AppText variant="caption" muted>
            {hint}
          </AppText>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={() => {
          haptics.select();
          onToggle();
        }}
        trackColor={{ true: colors.primary, false: colors.surfaceSunken }}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const settings = useSettings();
  const cloud = useWallet();
  const gc = useGameCenter();

  // Geliştirme kolaylığı: slidingpenguins://settings?reset=intros bağlantısı
  // tanıtımları sıfırlar (ekrana dokunmadan test edebilmek için).
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const { resetIntros } = settings;
  useEffect(() => {
    if (__DEV__ && reset === 'intros') resetIntros();
  }, [reset, resetIntros]);

  return (
    <Screen narrow>
      <View style={styles.header}>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <AppText variant="heading" accessibilityRole="header">
          {t('settings.title')}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <AppText variant="label" muted>
            {t('settings.language')}
          </AppText>
          <Segmented
            value={settings.language}
            onChange={settings.setLanguage}
            options={[
              { value: 'system', label: t('settings.auto') },
              // Dil adları her zaman kendi dilinde yazılır.
              { value: 'tr', label: 'Türkçe' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Card>

        <Card>
          <AppText variant="label" muted>
            {t('settings.theme')}
          </AppText>
          <Segmented
            value={settings.theme}
            onChange={settings.setTheme}
            options={[
              { value: 'system', label: t('settings.auto') },
              { value: 'day', label: t('settings.day') },
              { value: 'night', label: t('settings.night') },
            ]}
          />
        </Card>

        <Card>
          <ToggleRow
            label={t('settings.music')}
            value={settings.music}
            onToggle={() => settings.toggle('music')}
          />
          <ToggleRow
            label={t('settings.sfx')}
            value={settings.sfx}
            onToggle={() => settings.toggle('sfx')}
          />
          <ToggleRow
            label={t('settings.haptics')}
            value={settings.haptics}
            onToggle={() => settings.toggle('haptics')}
          />
        </Card>

        <Card>
          <ToggleRow
            label={t('settings.largeSymbols')}
            hint={t('settings.largeSymbolsHint')}
            value={settings.largeSymbols}
            onToggle={() => settings.toggle('largeSymbols')}
          />
        </Card>

        {/* iCloud yedekleme durumu: kapalıysa nazik bir hatırlatma. */}
        <Card>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTexts}>
              <AppText>{t('icloud.title')}</AppText>
              {!cloud.cloudAvailable && (
                <AppText variant="caption" muted>
                  {t('icloud.offHint')}
                </AppText>
              )}
            </View>
            <AppText variant="label" color={cloud.cloudAvailable ? colors.primary : colors.textMuted}>
              {!cloud.cloudAvailable ? t('icloud.off') : cloud.pendingSync ? t('icloud.pending') : t('icloud.on')}
            </AppText>
          </View>
        </Card>

        {/* Game Center: giriş durumu; dokununca giriş yapılır ya da liderlik tabloları açılır. */}
        <Card>
          <PressableScale
            accessibilityLabel={t('gamecenter.title')}
            disabled={!gc.available}
            onPress={() => void gameCenter.show('leaderboards')}
            style={styles.toggleRow}
          >
            <View style={styles.toggleTexts}>
              <AppText>{t('gamecenter.title')}</AppText>
              <AppText variant="caption" muted>
                {!gc.available
                  ? t('gamecenter.unavailable')
                  : gc.signedIn
                    ? t('gamecenter.signedIn', { name: gc.alias ?? '' })
                    : t('gamecenter.signedOut')}
              </AppText>
            </View>
            <SymbolView
              name={gc.signedIn ? 'checkmark.circle.fill' : 'gamecontroller.fill'}
              size={s(22)}
              weight="bold"
              tintColor={gc.signedIn ? colors.primary : colors.textMuted}
            />
          </PressableScale>
        </Card>

        {/* Yalnızca geliştirme sürümünde: test sahneleri */}
        {__DEV__ && (
          <Card>
            <AppText variant="label" muted>
              {t('dev.title')}
            </AppText>
            <PressableScale
              pressScale={0.98}
              onPress={() => router.push('/dev/characters')}
              style={styles.linkRow}
            >
              <AppText>{t('dev.characters')}</AppText>
              <SymbolView name="chevron.right" size={s(16)} weight="bold" tintColor={colors.textMuted} />
            </PressableScale>
            <PressableScale
              pressScale={0.98}
              onPress={() => router.push('/dev/levels')}
              style={styles.linkRow}
            >
              <AppText>{t('dev.levels')}</AppText>
              <SymbolView name="chevron.right" size={s(16)} weight="bold" tintColor={colors.textMuted} />
            </PressableScale>
            <PressableScale
              pressScale={0.98}
              onPress={() => router.push('/dev/wallet')}
              style={styles.linkRow}
            >
              <AppText>{t('dev.wallet')}</AppText>
              <SymbolView name="chevron.right" size={s(16)} weight="bold" tintColor={colors.textMuted} />
            </PressableScale>
            <PressableScale
              pressScale={0.98}
              disabled={settings.seenIntros.length === 0}
              onPress={settings.resetIntros}
              style={styles.linkRow}
            >
              <AppText muted={settings.seenIntros.length === 0}>{t('dev.resetIntros')}</AppText>
              <AppText variant="label" muted>
                {settings.seenIntros.length}
              </AppText>
            </PressableScale>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerSpacer: { width: s(48) },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm + spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: s(44),
  },
  toggleTexts: { flex: 1 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: s(44),
  },
});
