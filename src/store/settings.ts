/**
 * Kullanıcı tercihleri: dil, tema, ses, titreşim, renk körlüğü sembolleri.
 * MMKV'ye kalıcı yazılır; uygulama açılışında senkron okunur (bekleme yok).
 *
 * Bunlar cihaza özel tercihlerdir, iCloud'a gitmez.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LanguagePreference } from '@/i18n/locale';
import { zustandKvStorage } from '@/services/storage';
import type { ThemePreference } from '@/theme';

export interface SettingsState {
  /** 'system' → cihaz dilini izle. */
  language: LanguagePreference;
  /** 'system' → cihazın açık/koyu ayarını izle. */
  theme: ThemePreference;
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  /** Renk körlüğü için atkı ve bayrak sembollerini büyüt. */
  largeSymbols: boolean;
  /** Tanıtım animasyonu izlenmiş mekanikler (bir kez gösterilir). */
  seenIntros: string[];
  /** İlk açılış karşılaması yapıldı (uygulama doğrudan 1. bölümle açıldı). */
  firstRunDone: boolean;
  /** Başlatılan düello sayısı: her maçta sıradaki tahta gelsin diye. */
  duelMatches: number;

  setLanguage: (language: LanguagePreference) => void;
  setTheme: (theme: ThemePreference) => void;
  toggle: (key: 'music' | 'sfx' | 'haptics' | 'largeSymbols') => void;
  markIntroSeen: (mechanic: string) => void;
  /** Bütün tanıtımları yeniden gösterilecek hâle getirir (geliştirici aracı). */
  resetIntros: () => void;
  markFirstRunDone: () => void;
  countDuelMatch: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'system',
      theme: 'system',
      music: true,
      sfx: true,
      haptics: true,
      largeSymbols: false,
      seenIntros: [],
      firstRunDone: false,
      duelMatches: 0,

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
      markIntroSeen: (mechanic) =>
        set((s) => (s.seenIntros.includes(mechanic) ? s : { seenIntros: [...s.seenIntros, mechanic] })),
      resetIntros: () => set({ seenIntros: [] }),
      markFirstRunDone: () => set({ firstRunDone: true }),
      countDuelMatch: () => set((s) => ({ duelMatches: s.duelMatches + 1 })),
    }),
    {
      name: 'settings.v1',
      storage: createJSONStorage(() => zustandKvStorage),
      // Yalnızca veriyi sakla; fonksiyonlar her açılışta yeniden kurulur.
      partialize: ({ language, theme, music, sfx, haptics, largeSymbols, seenIntros, firstRunDone, duelMatches }) => ({
        language,
        theme,
        music,
        sfx,
        haptics,
        largeSymbols,
        seenIntros,
        firstRunDone,
        duelMatches,
      }),
    },
  ),
);
