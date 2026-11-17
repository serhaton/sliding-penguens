/**
 * Çeviri katmanı.
 *
 *   const { t, language } = useTranslation();
 *   t('home.level', { n: 12 })  →  "Bölüm 12" / "Level 12"
 *
 * Ayrı bir sağlayıcı (Provider) yok: dil, ayarlar deposundan ve cihazın dil
 * listesinden türetilir. Depo değişince bu kancayı kullanan her bileşen
 * kendiliğinden yeniden çizilir.
 */
import { getLocales, useLocales } from 'expo-localization';
import { useCallback } from 'react';

import { useSettings } from '@/store/settings';

import { en } from './en';
import { interpolate, resolveLanguage, type Language } from './locale';
import { tr, type TranslationKey, type Translations } from './tr';

export * from './locale';
export type { TranslationKey } from './tr';

const dictionaries: Record<Language, Translations> = { tr, en };

export type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

function translate(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  return interpolate(dictionaries[language][key], params);
}

/** Bileşenler için: dil değişince yeniden çizer. */
export function useTranslation(): { t: TranslateFn; language: Language } {
  const preference = useSettings((s) => s.language);
  // useLocales, kullanıcı iOS Ayarlar'dan dili değiştirip dönünce güncellenir.
  const locales = useLocales();
  const language = resolveLanguage(
    preference,
    locales.map((l) => l.languageCode),
  );
  const t = useCallback<TranslateFn>(
    (key, params) => translate(language, key, params),
    [language],
  );
  return { t, language };
}

/** React dışındaki kod için (servisler, paylaşım kartı metni vb.). */
export function getLanguage(): Language {
  return resolveLanguage(
    useSettings.getState().language,
    getLocales().map((l) => l.languageCode),
  );
}

export const t: TranslateFn = (key, params) => translate(getLanguage(), key, params);
