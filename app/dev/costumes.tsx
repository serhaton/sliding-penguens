/**
 * Kostüm sayfası (geliştirici aracı): bütün kostümler tek ekranda, penguenin
 * üstünde. Yeni bir çizimi denetlemek için.
 *   pengolo://dev/costumes?who=nar&pose=slide
 */
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Penguin, type Pose } from '@/components/penguin';
import { AppText, IconButton, Screen } from '@/components/ui';
import type { CharacterId } from '@/data/characters';
import { cosmetics } from '@/data/cosmetics';
import { useTranslation } from '@/i18n';
import { radii, spacing, useTheme } from '@/theme';

export default function CostumeSheet() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { who = 'piti', pose = 'idle' } = useLocalSearchParams<{ who?: CharacterId; pose?: Pose }>();
  return (
    <Screen>
      <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {cosmetics.map((item) => (
          <View key={item.id} style={[styles.cell, { backgroundColor: colors.surface }]}>
            <Penguin
              character={who}
              costume={{ [item.slot]: item.look }}
              pose={pose}
              direction={pose === 'slide' ? 'right' : 'down'}
              size={56}
              interactive={false}
            />
            <AppText variant="caption" numberOfLines={1}>
              {t(item.nameKey)}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.sm, justifyContent: 'center' },
  cell: { width: '18.5%', paddingTop: spacing.md, paddingBottom: 2, borderRadius: radii.md, alignItems: 'center' },
});
