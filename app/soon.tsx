/**
 * Henüz yapılmamış ekranlar için geçici yer tutucu. Gezinme ve geçiş
 * animasyonlarını şimdiden sınamamızı sağlar; her ekran kendi aşamasında
 * gerçeğiyle değiştirilecek ve sonunda bu dosya silinecek.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton, Screen } from '@/components/ui';
import { useTranslation, type TranslationKey } from '@/i18n';
import { s, spacing, useTheme } from '@/theme';

export default function SoonScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { titleKey } = useLocalSearchParams<{ titleKey?: TranslationKey }>();

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        {titleKey && <AppText variant="heading">{t(titleKey)}</AppText>}
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        <SymbolView name="snowflake" size={s(56)} weight="bold" tintColor={colors.primary} />
        <AppText variant="title" center>
          {t('soon.title')}
        </AppText>
        <AppText muted center>
          {t('soon.body')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: { width: s(48) },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
