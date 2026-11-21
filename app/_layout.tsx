/**
 * Kök yerleşim: bütün ekranları saran yığın (stack) gezgini.
 *
 * Açılışta yükleme beklemesi yok: yazı tipleri uygulamaya gömülü, ayarlar
 * MMKV'den senkron okunuyor. Yalnızca kısa açılış animasyonu (IntroSplash) oynar. Ekranlardan bağımsız servisler burada başlatılır (cüzdan ve
 * iCloud birleştirme, satın alma dinleyicisi; ileride Game Center girişi).
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startWallet } from '@/economy/wallet';
import { AchievementToast } from '@/components/hud/AchievementToast';
import { IntroSplash } from '@/components/intro/IntroSplash';
import { startAchievements } from '@/services/achievementSync';
import { startDevRemote } from '@/services/devRemote';
import { music } from '@/services/music';
import { startStore } from '@/services/store';
import { useSettings } from '@/store/settings';
import { motion, useTheme } from '@/theme';

/** Açılış animasyonu bitene kadar müzik beklenir (ms). */
const MUSIC_DELAY_MS = 2600;

export default function RootLayout() {
  const { colors, isNight } = useTheme();

  // Ekranlardan bağımsız servisler: uygulama açılır açılmaz başlar.
  useEffect(() => {
    startWallet();
    // Mağaza: yarım kalan satın alımlar teslim edilir, sahiplik yenilenir.
    void startStore();
    // Başarımlar ve Game Center skorları: durum değiştikçe eşitlenir.
    startAchievements();
    // Yalnızca geliştirme: ekran görüntüsü otomasyonu için uzaktan kumanda.
    startDevRemote();
    // Fon müziği: açılış animasyonunun harf sesleri bittikten sonra ana tema başlar.
    const musicTimer = setTimeout(() => music.start(), MUSIC_DELAY_MS);
    // Başlangıç paketi teklifinin süresi ilk açılıştan sayılır.
    useSettings.getState().stampFirstRun(Date.now());
    return () => clearTimeout(musicTimer);
  }, []);

  // Ekran geçişlerinde arkadan beyaz bir zemin görünmesin.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bgBottom).catch(() => {});
  }, [colors.bgBottom]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgBottom }}>
      <StatusBar style={isNight ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          animationDuration: motion.base,
          contentStyle: { backgroundColor: colors.bgBottom },
        }}
      />
      {/* Yeni başarım notu: hangi ekranda olunursa olsun üstte belirir. */}
      <AchievementToast />
      {/* Açılış animasyonu: ad harf harf gelir, sonra perde açılır. */}
      <IntroSplash />
    </GestureHandlerRootView>
  );
}
