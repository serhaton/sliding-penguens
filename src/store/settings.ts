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

export interface Counters {
  noUndoWins: number;
  duelBlocks: number;
  hardCpuWins: number;
}

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
  /** İlk açılış zamanı (ms): başlangıç paketi teklifinin süresi buradan sayılır. 0 = henüz bilinmiyor. */
  firstRunAt: number;
  /**
   * Başarım sayaçları (bu cihazda): cüzdanda karşılığı olmayan olaylar.
   *  - noUndoWins: geri al kullanmadan ilk kez bitirilen bölümler
   *  - duelBlocks: düelloda rakibin pengueni bizimkine çarpıp durdu
   *  - hardCpuWins: zor bilgisayara karşı kazanılan düellolar (liderlik tablosu)
   */
  counters: Counters;
  /** Başlatılan düello sayısı: her maçta sıradaki tahta gelsin diye. */
  duelMatches: number;

  setLanguage: (language: LanguagePreference) => void;
  setTheme: (theme: ThemePreference) => void;
  toggle: (key: 'music' | 'sfx' | 'haptics' | 'largeSymbols') => void;
  markIntroSeen: (mechanic: string) => void;
  /** Bütün tanıtımları yeniden gösterilecek hâle getirir (geliştirici aracı). */
  resetIntros: () => void;
  markFirstRunDone: () => void;
  /** İlk açılış zamanını bir kez kaydeder. */
  stampFirstRun: (now: number) => void;
  countDuelMatch: () => void;
  /** Bir başarım sayacını bir artırır. */
  bump: (counter: keyof Counters) => void;
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
      firstRunAt: 0,
      counters: { noUndoWins: 0, duelBlocks: 0, hardCpuWins: 0 },
      duelMatches: 0,

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
      markIntroSeen: (mechanic) =>
        set((s) => (s.seenIntros.includes(mechanic) ? s : { seenIntros: [...s.seenIntros, mechanic] })),
      resetIntros: () => set({ seenIntros: [] }),
      markFirstRunDone: () => set({ firstRunDone: true }),
      stampFirstRun: (now) => set((s) => (s.firstRunAt > 0 ? s : { firstRunAt: now })),
      countDuelMatch: () => set((s) => ({ duelMatches: s.duelMatches + 1 })),
      bump: (counter) => set((s) => ({ counters: { ...s.counters, [counter]: s.counters[counter] + 1 } })),
    }),
    {
      name: 'settings.v1',
      storage: createJSONStorage(() => zustandKvStorage),
      // Yalnızca veriyi sakla; fonksiyonlar her açılışta yeniden kurulur.
      partialize: ({ language, theme, music, sfx, haptics, largeSymbols, seenIntros, firstRunDone, firstRunAt, counters, duelMatches }) => ({
        language,
        theme,
        music,
        sfx,
        haptics,
        largeSymbols,
        seenIntros,
        firstRunDone,
        firstRunAt,
        counters,
        duelMatches,
      }),
    },
  ),
);
