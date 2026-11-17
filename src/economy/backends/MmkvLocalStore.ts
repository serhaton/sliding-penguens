/** Cüzdanın yerel deposu: tercihlerden ayrı bir MMKV örneği. */
import { createMMKV } from 'react-native-mmkv';

import type { LocalStore } from './WalletBackend';

export function createMmkvLocalStore(): LocalStore {
  const kv = createMMKV({ id: 'wallet' });
  return {
    get: (key) => kv.getString(key),
    set: (key, value) => kv.set(key, value),
  };
}
