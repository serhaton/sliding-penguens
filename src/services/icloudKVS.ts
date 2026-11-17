/**
 * iCloud anahtar-değer deposunun native bağlantısı.
 * Kütüphane yalnızca burada içe aktarılır; değiştirmek gerekirse tek dosya.
 */
import { addChangeListener, getAllKeys, getString, isAvailable, setString } from '@nauverse/expo-cloud-settings';

import type { ICloudStore } from '@/economy/backends/ICloudKVSWalletBackend';

export const icloudStore: ICloudStore = {
  isAvailable,
  getAllKeys,
  getString,
  setString,
  addChangeListener,
};
