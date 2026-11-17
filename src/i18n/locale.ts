/**
 * Dil seçimi mantığı — saf fonksiyonlar (React ve native modül yok), bu yüzden
 * jest ile doğrudan test edilir.
 */

export const supportedLanguages = ['tr', 'en'] as const;
export type Language = (typeof supportedLanguages)[number];

/** 'system' → cihazın dil sırasına göre otomatik seç. */
export type LanguagePreference = 'system' | Language;

/** Desteklenmeyen bir dilde cihaz için geri dönüş dili. */
export const fallbackLanguage: Language = 'en';

function isSupported(code: string | null | undefined): code is Language {
  return (supportedLanguages as readonly string[]).includes(code ?? '');
}

/**
 * Kullanıcının tercihini ve cihazın dil listesini somut bir dile çevirir.
 *
 * Cihaz listesi öncelik sırasındadır (ör. ['de', 'tr', 'en']). İlk dile değil,
 * desteklediğimiz ilk dile bakarız: Almanca + Türkçe kullanan biri İngilizce
 * yerine Türkçe görmeli.
 */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLanguageCodes: readonly (string | null | undefined)[],
): Language {
  if (preference !== 'system') return preference;
  for (const code of deviceLanguageCodes) {
    const normalized = code?.toLowerCase().split(/[-_]/)[0];
    if (isSupported(normalized)) return normalized;
  }
  return fallbackLanguage;
}

/** Metindeki `{ad}` yer tutucularını değerlerle doldurur. */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}
