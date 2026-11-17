/**
 * Oyunun büyük yapısı: Kıta → Episode → Bölüm.
 *
 *  - Kıta: haritası ve konsepti olan büyük paket (şimdilik yalnızca Antarktika,
 *    90 bölüm). Oyun tutarsa dünyanın diğer kıtaları kendi konseptleriyle bu
 *    listeye eklenir; her kıta ayrı bir içerik paketi olarak sunulabilir.
 *  - Episode: 30 bölümlük grup. Her episode yeni bir mekanik getirir ve kıta
 *    haritasında bir bölgeyi kaplar.
 *  - Bölüm: tek bir bulmaca.
 *
 * Bölümleri henüz hazır olmayan episode'lar da burada durur: haritada kilitli
 * bölge olarak görünürler, oyuncu devamının geleceğini bilir.
 *
 * Not: bölüm verisindeki `world` alanı (LevelDef.world) episode numarasıdır;
 * motor ve üretici o adı kullanmaya devam ediyor.
 */
import type { PenguinColor } from '@/engine/types';
import type { TranslationKey } from '@/i18n';

export interface Episode {
  /** Kıta içinde 1'den başlar; bölüm verisindeki `world` alanıyla aynı. */
  id: number;
  titleKey: TranslationKey;
  /** Bu episode'daki bölüm sayısı (bölümleri hazır olmasa da haritada yer ayrılır). */
  levelCount: number;
  /** Haritadaki bölgenin rengi. */
  color: PenguinColor;
}

export interface Continent {
  id: string;
  titleKey: TranslationKey;
  episodes: readonly Episode[];
}

export const LEVELS_PER_EPISODE = 30;

export const antarctica: Continent = {
  id: 'antarctica',
  titleKey: 'map.antarctica',
  episodes: [
    { id: 1, titleKey: 'map.episode1', levelCount: LEVELS_PER_EPISODE, color: 'blue' },
    { id: 2, titleKey: 'map.episode2', levelCount: LEVELS_PER_EPISODE, color: 'orange' },
    { id: 3, titleKey: 'map.episode3', levelCount: LEVELS_PER_EPISODE, color: 'red' },
  ],
};

/** Bütün kıtalar, açılma sırasıyla. */
export const continents: readonly Continent[] = [antarctica];
