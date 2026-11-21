/**
 * Geliştirici ekranları (karakter sahnesi, bölüm görüntüleyici, cüzdan
 * tanılama vb.) yalnızca geliştirme sürümünde açılır.
 *
 * `app/` altındaki her dosya bir rotadır ve yayın paketine de girer: bu kapı
 * olmasa `pengolo://dev/wallet` gibi bir bağlantı yayın sürümünde de açılırdı.
 * Yayın sürümünde bu klasördeki bütün rotalar ana ekrana yönlenir.
 */
import { Redirect, Slot } from 'expo-router';

export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Slot />;
}
