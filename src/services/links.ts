/**
 * Uygulamadan açılan dış adresler. Sitenin yolu değişirse yalnızca bu dosya
 * (ve appstore.md'deki "Adresler" tablosu) güncellenir.
 */
import type { Language } from '@/i18n';

const SITE = 'https://serhaton.com/sliding-penguens/1.0';

export const links = {
  /** Gizlilik politikası, oyunun dilinde. App Store Connect'teki adresle aynı sayfa. */
  privacy: (language: Language) => `${SITE}/${language}/privacy.html`,
};
