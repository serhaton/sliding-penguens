/**
 * Tanıtım verisi (geliştirici aracı): mağaza ekran görüntüleri için oyunu
 * "ilerlemiş bir oyuncu" durumuna getirir ve sessiz modu açar.
 *
 *   pengolo://dev/seed?lang=tr
 *
 * Yalnızca boş bir simülatörde kullan: cüzdana gerçek kayıtlar yazar (yıldız,
 * coin, kostüm) ve iCloud açıksa bunlar eşitlenir.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Screen } from '@/components/ui';
import { mechanics } from '@/data/mechanics';
import { wallet } from '@/economy/wallet';
import { addDays } from '@/game/daily';
import { todayKey } from '@/services/clock';
import { devFlags } from '@/services/devFlags';
import { useSettings } from '@/store/settings';

/** Bitirilmiş görünecek bölüm sayısı ve yıldız deseni. */
const CLEARED = 36;
const STARS = [3, 3, 2, 3, 3, 3, 2, 3];
const COSMETICS: [string, number][] = [
  ['hat.beanie', 200],
  ['hat.party', 450],
  ['hat.crown', 1500],
  ['hair.mohawk', 450],
  ['glasses.shades', 600],
  ['scarf.rainbow', 3000],
];

async function seed(
  lang: string | undefined,
  theme: string | undefined,
  symbols: string | undefined,
  quiet: string | undefined,
) {
  // ?quiet=0: sessiz mod kapalı kalır (açılış animasyonu ve sistem pencereleri görünür).
  devFlags.setQuiet(quiet !== '0');
  const settings = useSettings.getState();
  settings.markFirstRunDone();
  for (const id of Object.keys(mechanics)) settings.markIntroSeen(id);
  settings.setTheme(theme === 'night' ? 'night' : 'day');
  // Büyük semboller: ?symbols=1 açar, yoksa kapalı.
  if (useSettings.getState().largeSymbols !== (symbols === '1')) settings.toggle('largeSymbols');
  settings.setLanguage(lang === 'tr' || lang === 'en' ? lang : 'system');

  const w = wallet();
  for (let i = 1; i <= CLEARED; i++) await w.recordLevelResult(String(i), STARS[i % STARS.length]!);
  await w.addPurchase('seed-coins', 9000);
  for (const [id, price] of COSMETICS) await w.buyCosmetic(id, price);
  await w.setEquipped({ character: 'piti', hat: 'hat.beanie', scarf: 'scarf.rainbow' });
  // Dört günlük seri (bugün hariç: günlük bulmaca oynanabilir kalsın) ve bugünün hediyesi alınmış.
  const today = todayKey();
  for (let d = 4; d >= 1; d--) await w.claimDailyPuzzle(addDays(today, -d));
  await w.claimLogin(today, 3);
  for (let i = 0; i < 4; i++) await w.recordDuelResult(`seed-duel-${i}`, i === 3 ? 'loss' : 'win');
}

export default function SeedScreen() {
  const { lang, theme, symbols, quiet } = useLocalSearchParams<{
    lang?: string;
    theme?: string;
    symbols?: string;
    quiet?: string;
  }>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!__DEV__) return;
    void seed(lang, theme, symbols, quiet).then(() => {
      setDone(true);
      router.dismissTo('/');
    });
  }, [lang, theme, symbols, quiet]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="heading">{done ? 'OK' : '…'}</AppText>
      </View>
    </Screen>
  );
}
