/**
 * Renk paleti — gündüz ve gece.
 *
 * Kural: sakin, açık zeminler + az sayıda canlı vurgu. Ekranlar asla ham hex
 * kullanmaz; her zaman `useTheme().colors` üzerinden okur. Böylece gece teması
 * ve ileride gelecek mevsimlik temalar tek yerden değişir.
 */

import type { PenguinColor } from '@/engine/types';

// Renk adlarının kaynağı oyun motoru; tema yalnızca onlara ton atar.
export type { PenguinColor };

/**
 * Atkı / takım renkleri. İki temada da aynı kalır: doygun ve birbirinden net
 * ayrışan tonlar. Renk körlüğü için her renge ayrıca bir sembol eşlik edecek
 * (4. aşama), yani ayrım yalnızca renge dayanmıyor.
 */
export const penguinColors: Record<PenguinColor, { main: string; dark: string; light: string }> = {
  blue: { main: '#2E86F5', dark: '#1B63C4', light: '#CFE4FF' },
  orange: { main: '#FF8A3D', dark: '#D9651A', light: '#FFE1CC' },
  red: { main: '#FF5470', dark: '#D4304D', light: '#FFD3DB' },
  yellow: { main: '#FFC93C', dark: '#D99E0B', light: '#FFF1C7' },
  green: { main: '#22C58B', dark: '#12996A', light: '#C9F3E2' },
  purple: { main: '#8B6CF6', dark: '#6646D6', light: '#E2D9FF' },
};

export interface ThemeColors {
  /** Ekran zemini (dikey geçişin üstü ve altı). */
  bgTop: string;
  bgBottom: string;
  /** Kartlar, butonlar gibi yükseltilmiş yüzeyler. */
  surface: string;
  /** Yüzeyin bir kademe koyusu: basılı hâl, ayraçlar, seçili olmayan sekmeler. */
  surfaceSunken: string;
  /** Ana metin ve ikon rengi. */
  text: string;
  /** İkincil, daha sessiz metin. */
  textMuted: string;
  /** Ana eylem (Oyna) rengi ve üstündeki metin. */
  primary: string;
  primaryDark: string;
  onPrimary: string;
  /** İkinci vurgu (Düello). */
  accent: string;
  accentDark: string;
  onAccent: string;
  /** Coin altını. */
  coin: string;
  /** Kutup ışıkları — süsleme amaçlı. */
  auroraGreen: string;
  auroraPurple: string;
  /** Arka plandaki kar taneleri ve tepeler. */
  snow: string;
  /** Kar tanesinin ince kenar çizgisi: açık zeminde beyaz karı görünür kılar. */
  snowEdge: string;
  hillNear: string;
  hillFar: string;
  /** Dünya haritası: okyanus, kıyıdaki sığ su ve kıtanın karı. */
  sea: string;
  seaShallow: string;
  land: string;
  /** Gölgeler (çok hafif). */
  shadow: string;
}

export const dayColors: ThemeColors = {
  bgTop: '#B5D9F5',
  bgBottom: '#E4F1FB',
  surface: '#FFFFFF',
  surfaceSunken: '#E3EEF7',
  text: '#1B2A4A',
  textMuted: '#6C7F9E',
  primary: '#2E86F5',
  primaryDark: '#1B63C4',
  onPrimary: '#FFFFFF',
  accent: '#FF8A3D',
  accentDark: '#D9651A',
  onAccent: '#FFFFFF',
  coin: '#FFC93C',
  auroraGreen: '#7DE3C0',
  auroraPurple: '#B9A5FA',
  snow: '#FFFFFF',
  snowEdge: '#A3CBEE',
  hillNear: '#FFFFFF',
  hillFar: '#C4DEF3',
  sea: '#7DB9EA',
  seaShallow: '#A9D3F3',
  land: '#FFFFFF',
  shadow: '#1B2A4A',
};

export const nightColors: ThemeColors = {
  bgTop: '#0D1830',
  bgBottom: '#182B52',
  surface: '#22386A',
  surfaceSunken: '#172848',
  text: '#EDF4FF',
  textMuted: '#93A7CC',
  primary: '#4C9BFF',
  primaryDark: '#2B72D6',
  onPrimary: '#FFFFFF',
  accent: '#FF9A57',
  accentDark: '#DB7230',
  onAccent: '#FFFFFF',
  coin: '#FFD45E',
  auroraGreen: '#3FD9A4',
  auroraPurple: '#8B6CF6',
  snow: '#DCE9FF',
  snowEdge: '#DCE9FF00',
  hillNear: '#2A4379',
  hillFar: '#1D3260',
  sea: '#0E1F42',
  seaShallow: '#17305F',
  land: '#2F4A85',
  shadow: '#000000',
};
