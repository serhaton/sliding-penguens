/**
 * Yerel anahtar-değer deposu (MMKV): senkron ve çok hızlı.
 *
 * Buradaki `kv` yalnızca cihaza özel tercihler içindir (dil, tema, ses...).
 * Coin ve ilerleme verisi 7–8. aşamada WalletService üzerinden, kendi MMKV
 * örneğinde tutulacak; ekranlar o veriye buradan dokunmamalı.
 */
import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const kv = createMMKV({ id: 'prefs' });

/** zustand `persist` ara katmanının beklediği arayüze uyarlama. */
export const zustandKvStorage: StateStorage = {
  getItem: (name) => kv.getString(name) ?? null,
  setItem: (name, value) => kv.set(name, value),
  removeItem: (name) => {
    kv.remove(name);
  },
};
