/**
 * Geliştirici uzaktan kumandası (yalnızca geliştirme sürümü).
 *
 * Simülatörde dokunmadan ekran değiştirmek için: Mac'te küçük bir dosya
 * sunucusu çalışıyorsa (scripts/make-store-assets.py başlatır) uygulama oradaki
 * `cmd.json` dosyasını dinler ve yazan rotaya gider:
 *
 *   { "id": 7, "route": "/level/9" }
 *
 * Sunucu yoksa (normal geliştirme, gerçek cihaz) ilk denemede vazgeçer ve bir
 * daha sormaz. Yayın sürümünde hiç çalışmaz.
 */
import { router } from 'expo-router';

const URL = 'http://localhost:8799/cmd.json';
const POLL_MS = 600;

export function startDevRemote(): void {
  if (!__DEV__) return;
  let lastId = -1;
  let primed = false;

  const poll = async () => {
    try {
      const response = await fetch(`${URL}?t=${Date.now()}`);
      const command = (await response.json()) as { id: number; route: string };
      // İlk okunan komut yalnızca başlangıç noktasıdır: eski bir komut yeniden oynatılmaz.
      if (!primed) {
        primed = true;
        lastId = command.id;
      } else if (command.id !== lastId) {
        lastId = command.id;
        router.dismissTo('/');
        if (command.route !== '/') router.push(command.route as never);
      }
      setTimeout(poll, POLL_MS);
    } catch {
      // Sunucu yok: ilk denemede vazgeç; çalışırken koparsa da dur.
    }
  };
  void poll();
}
