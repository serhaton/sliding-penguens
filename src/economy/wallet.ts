/**
 * Uygulamanın tek cüzdanı ve React bağlantısı.
 *
 *   const { balance } = useWallet();          // ekranda bakiye
 *   await wallet().recordLevelResult('7', 3); // işlem
 *
 * Cüzdan ilk kullanıldığında kurulur. Cihaz kimliği ve yerel veri senkron
 * okunduğu için bakiye, iCloud beklenmeden hemen hazırdır; `startWallet()`
 * uygulama açılışında iCloud'la eşitlemeyi başlatır.
 */
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getDeviceId } from '@/services/deviceId';
import { icloudStore } from '@/services/icloudKVS';

import { ICloudKVSWalletBackend } from './backends/ICloudKVSWalletBackend';
import { createMmkvLocalStore } from './backends/MmkvLocalStore';
import { WalletService, type WalletSnapshot } from './WalletService';

let instance: WalletService | null = null;
let backend: ICloudKVSWalletBackend | null = null;
let started = false;

export function wallet(): WalletService {
  if (!instance) {
    backend = new ICloudKVSWalletBackend(icloudStore);
    instance = new WalletService({
      deviceId: getDeviceId(),
      backend,
      local: createMmkvLocalStore(),
    });
  }
  return instance;
}

/**
 * Uygulama açılışında bir kez çağrılır (kök yerleşimden). iCloud'la eşitler,
 * değişiklik bildirimlerini dinler ve uygulama her öne geldiğinde yeniden
 * eşitler: iCloud bildirimi yalnızca uygulama çalışırken gelir, arka plandayken
 * olan değişiklikler böyle yakalanır.
 */
export function startWallet(): void {
  if (started) return;
  started = true;
  const service = wallet();
  void service.start();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void service.sync();
  });
}

/** Bakiye ve durum; değişince bileşeni yeniden çizer. */
export function useWallet(): WalletSnapshot {
  const service = wallet();
  return useSyncExternalStore(
    (listener) => service.subscribe(listener),
    () => service.getSnapshot(),
  );
}

/** Geliştirici ekranı için tanılama bilgisi. */
export function walletDiagnostics(): { deviceId: string; quotaExceeded: boolean } {
  wallet();
  return { deviceId: getDeviceId(), quotaExceeded: backend?.quotaExceeded ?? false };
}
