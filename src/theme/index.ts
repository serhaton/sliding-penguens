/**
 * Tema girişi. Bileşenler yalnızca `useTheme()` çağırır.
 *
 * Tema seçimi ayarlar deposundan gelir: 'system' ise cihazın açık/koyu
 * tercihini izler, 'day' / 'night' ise kullanıcının seçimi geçerlidir.
 */
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';

import { dayColors, nightColors, type ThemeColors } from './colors';

export * from './colors';
export * from './device';
export * from './tokens';

export type ThemeName = 'day' | 'night';
export type ThemePreference = 'system' | ThemeName;

export interface Theme {
  name: ThemeName;
  isNight: boolean;
  colors: ThemeColors;
}

const themes: Record<ThemeName, Theme> = {
  day: { name: 'day', isNight: false, colors: dayColors },
  night: { name: 'night', isNight: true, colors: nightColors },
};

/** Tercihi ve cihaz ayarını somut bir temaya çevirir (saf fonksiyon, test edilebilir). */
export function resolveThemeName(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ThemeName {
  if (preference !== 'system') return preference;
  return systemScheme === 'dark' ? 'night' : 'day';
}

export function useTheme(): Theme {
  const preference = useSettings((s) => s.theme);
  const systemScheme = useColorScheme();
  return themes[resolveThemeName(preference, systemScheme)];
}
