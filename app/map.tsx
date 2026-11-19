/**
 * Dünya haritası ekranı: üstte ince başlık (kıta adı, oynanan macera ve yıldızları, coin),
 * altında kaydırılan harita. Bir düğüme dokununca o bölüm açılır.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CoinCounter } from '@/components/hud/CoinCounter';
import { WorldMap } from '@/components/map/WorldMap';
import { AppText, IconButton, Screen } from '@/components/ui';
import { antarctica } from '@/data/continents';
import { getLevel, levels } from '@/data/levels';
import { useProgress } from '@/game/progress';
import { useTranslation } from '@/i18n';

export default function MapScreen() {
  const { t } = useTranslation();
  const progress = useProgress();
  // Oyuncunun kaldığı macera ve o maceradaki yıldızları.
  const current = getLevel(progress.currentId);
  const episode = antarctica.episodes.find((e) => e.id === current?.world) ?? antarctica.episodes[0]!;
  const episodeLevels = levels.filter((level) => level.world === episode.id);
  const stars = episodeLevels.reduce((sum, level) => sum + progress.starsOf(level.id), 0);
  // Geliştirme kolaylığı: pengolo://map?overview=1 uzak görünümde kalır.
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
          {/* Yıldızlar kıtanın tamamını değil, oynanan macerayı sayar: adı da yazılır. */}
          <AppText variant="caption" muted numberOfLines={1}>
            {t('map.episode', { n: episode.id })} · {t(episode.titleKey)}
          </AppText>
          <AppText variant="caption" muted>
            {t('map.stars', { n: stars, max: episodeLevels.length * 3 })}
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
