/**
 * Kök yerleşim: bütün ekranları saran yığın (stack) gezgini.
 *
 * Açılışta hiçbir bekleme yok: yazı tipleri uygulamaya gömülü, ayarlar MMKV'den
 * senkron okunuyor. İleride burada ekranlardan bağımsız servisler de başlatılacak
 * (satın alma dinleyicisi, iCloud birleştirme, Game Center girişi).
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startWallet } from '@/economy/wallet';
import { motion, useTheme } from '@/theme';

export default function RootLayout() {
  const { colors, isNight } = useTheme();

  // Ekranlardan bağımsız servisler: uygulama açılır açılmaz başlar.
  useEffect(() => {
    startWallet();
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
    </GestureHandlerRootView>
  );
}
