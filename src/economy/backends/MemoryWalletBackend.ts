/**
 * Bellekte çalışan bulut ve yerel depo: testler ve geliştirme için.
 *
 * `MemoryCloud` tek bir iCloud hesabını temsil eder; her cihaz ona kendi
 * `MemoryWalletBackend`'i ile bağlanır. Bir cihaz çevrimdışı yapılabilir
 * (`online = false`): o sırada okuyamaz, yazamaz ve bildirim almaz — iki
 * cihazın birbirinden habersiz işlem yaptığı senaryolar böyle kurulur.
 */
import type { LocalStore, WalletBackend } from './WalletBackend';

export class MemoryCloud {
  readonly data = new Map<string, string>();
  readonly backends = new Set<MemoryWalletBackend>();
}

export class MemoryWalletBackend implements WalletBackend {
  /** false: iCloud kapalı ya da ağ yok. */
  online = true;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly cloud: MemoryCloud) {
    cloud.backends.add(this);
  }

  async isAvailable(): Promise<boolean> {
    return this.online;
  }

  async readAll(prefix: string): Promise<Record<string, string>> {
    if (!this.online) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of this.cloud.data) if (key.startsWith(prefix)) out[key] = value;
    return out;
  }

  async write(key: string, value: string): Promise<void> {
    if (!this.online) throw new Error('Bulut deposu kullanılamıyor');
    this.cloud.data.set(key, value);
    // Değişiklik bildirimi yalnızca DİĞER çevrimiçi cihazlara gider.
    for (const other of this.cloud.backends) if (other !== this && other.online) other.notify();
  }

  subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export class MemoryLocalStore implements LocalStore {
  private readonly data = new Map<string, string>();
  get(key: string): string | undefined {
    return this.data.get(key);
  }
  set(key: string, value: string): void {
    this.data.set(key, value);
  }
}
