/**
 * Cihaz ölçeği: iPad'de arayüz telefondaki ölçülerle kalırsa ekranın ortasında
 * küçücük bir sütun olur. Bu yüzden bütün ölçüler (yazı, boşluk, düğme) tek bir
 * katsayıyla büyütülür, ekranlar da geniş alanı kullanacak biçimde dizilir.
 *
 * Uygulama dikey yönde kilitli ve iPad'de tam ekran çalışır (app.json), bu
 * yüzden pencere boyutu uygulama açıkken değişmez: ölçek açılışta bir kez
 * hesaplanır ve sabit kalır.
 */
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const shortSide = Math.min(width, height);

/** iPad (ve benzeri geniş ekran) mı? */
export const isTablet = shortSide >= 600;

/**
 * Arayüz katsayısı: telefonda 1. iPad'de ekran, ölçek uygulandıktan sonra
 * yaklaşık 700 pt genişliğinde bir tuval gibi davranır (mini ≈1.15, 13" ≈1.47).
 */
export const ui = isTablet ? Math.min(1.5, Math.max(1.15, shortSide / 700)) : 1;

/** Bir ölçüyü cihaz katsayısıyla büyütür: `s(48)`. */
export function s(value: number): number {
  return Math.round(value * ui);
}
