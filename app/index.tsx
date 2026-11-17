/**
 * Ana ekran. Tek odak: "Oyna". Altında "Düello", köşelerde dört küçük ikon.
 *
 * "Oyna" kaldığın bölümü açar; alttaki harita ikonu bütün yolu gösterir.
 * Başlığın üstündeki penguen dokununca zıplar.
 *
 * İlk açılışta menü gösterilmez: oyuncu doğrudan 1. bölüme düşer, oynamayı
 * oynayarak öğrenir. Geri dönünce bu ekranı görür.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { CoinCounter } from '@/components/hud/CoinCounter';
import { Penguin } from '@/components/penguin';
import { AppText, BigButton, IconButton, Screen } from '@/components/ui';
import { antarctica } from '@/data/continents';
import { useProgress } from '@/game/progress';
import { useTranslation, type TranslationKey } from '@/i18n';
import { useSettings } from '@/store/settings';
import { spacing } from '@/theme';

/** Henüz yapılmamış ekranlar için ortak yer tutucuya git. */
function openSoon(titleKey: TranslationKey) {
  router.push({ pathname: '/soon', params: { titleKey } });
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const progress = useProgress();
  const firstRunDone = useSettings((s) => s.firstRunDone);
  const markFirstRunDone = useSettings((s) => s.markFirstRunDone);

    const play = () => router.push({ pathname: '/level/[id]', params: { id: progress.currentId } });

  // İlk açılış: doğrudan 1. bölüm. Bir kez yapılır; ilerlemesi olan oyuncuya
  // (ör. iCloud'dan geri yüklenen) hiç yapılmaz.
  useEffect(() => {
    if (firstRunDone) return;
    markFirstRunDone();
    if (progress.fresh) router.push({ pathname: '/level/[id]', params: { id: progress.currentId } });
  }, [firstRunDone, markFirstRunDone, progress.fresh, progress.currentId]);

  return (
    <Screen>
      {/* Üst köşeler */}
      <View style={styles.cornerRow}>
        <IconButton
          icon="calendar"
          label={t('home.daily')}
          onPress={() => openSoon('home.daily')}
        />
        <CoinCounter />
        <IconButton
          icon="gearshape.fill"
          label={t('home.settings')}
          onPress={() => router.push('/settings')}
        />
      </View>

      {/* Penguen + başlık */}
      <View style={styles.hero}>
        <Penguin character="piti" size={190} label={t('app.name')} />
        <AppText variant="display" center accessibilityRole="header">
          {t('app.name').replace(' ', '\n')}
        </AppText>
      </View>

      {/* Ana eylemler: başparmağın rahat ulaştığı alt bölge */}
      <View style={styles.actions}>
        <BigButton
          title={t('home.play')}
          // Kıta + bölüm: oyuncu hangi kıtada, kaçıncı bölümde kaldığını görür.
          subtitle={`${t(antarctica.titleKey)} · ${t('home.level', { n: progress.currentNumber })}`}
          icon="play.fill"
          onPress={play}
        />
        <BigButton
          title={t('home.duel')}
          icon="person.2.fill"
          tone="accent"
          size="medium"
          onPress={() => router.push('/duel')}
        />
      </View>

      {/* Alt köşeler */}
      <View style={styles.cornerRow}>
        <IconButton
          icon="person.crop.circle.fill"
          label={t('home.profile')}
          onPress={() => openSoon('home.profile')}
        />
        <IconButton icon="map.fill" label={t('home.map')} onPress={() => router.push('/map')} />
        <IconButton
          icon="bag.fill"
          label={t('home.shop')}
          onPress={() => openSoon('home.shop')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cornerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
