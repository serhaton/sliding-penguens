/**
 * Geliştirici bayrakları (yalnızca geliştirme sürümünde etkilidir).
 *
 * `quiet`: tanıtım görüntüleri alınırken sistem pencereleri (Game Center
 * girişi, reklam izinleri) ve başarım notları açılmasın. dev/seed ekranı açar.
 */
import { kv } from './storage';

const QUIET_KEY = 'dev.quiet';

export const devFlags = {
  get quiet(): boolean {
    return __DEV__ && kv.getBoolean(QUIET_KEY) === true;
  },
  setQuiet(value: boolean): void {
    kv.set(QUIET_KEY, value);
  },
};
