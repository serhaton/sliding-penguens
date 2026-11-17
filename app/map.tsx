/**
 * Dünya haritası ekranı: üstte ince başlık (kıta adı, toplam yıldız, coin),
 * altında kaydırılan harita. Bir düğüme dokununca o bölüm açılır.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CoinCounter } from '@/components/hud/CoinCounter';
import { WorldMap } from '@/components/map/WorldMap';
import { AppText, IconButton, Screen } from '@/components/ui';
import { useProgress } from '@/game/progress';
import { useTranslation } from '@/i18n';

export default function MapScreen() {
  const { t } = useTranslation();
  const progress = useProgress();
  // Geliştirme kolaylığı: slidingpenguins://map?overview=1 uzak görünümde kalır.
  const { overview } = useLocalSearchParams<{ overview?: string }>();

  return (
    <Screen>
      <View style={styles.header}>
        {/* Yan sütunlar eşit genişlikte: başlık tam ortada kalır. */}
        <View style={styles.side}>
          <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        </View>
        <View style={styles.title}>
          <AppText variant="heading" accessibilityRole="header">
            {t('map.antarctica')}
          </AppText>
          <AppText variant="caption" muted>
            {t('map.stars', { n: progress.totalStars, max: progress.maxStars })}
          </AppText>
        </View>
        <View style={[styles.side, styles.right]}>
          <CoinCounter />
        </View>
      </View>

      <WorldMap
        progress={progress}
        stayFar={__DEV__ && overview === '1'}
        onOpenLevel={(id) => router.push({ pathname: '/level/[id]', params: { id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  title: { alignItems: 'center' },
});
