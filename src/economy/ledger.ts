/**
 * Yerel işlem kaydı. İki işi var:
 *  1. Geçmiş ve hata ayıklama: hangi coin nereden geldi, nereye gitti.
 *  2. Tekrar koruması: aynı `id` ikinci kez uygulanmaz (idempotency).
 *
 * Yalnızca cihazda durur, iCloud'a gönderilmez. Sonsuza kadar büyümesin diye
 * en eski kayıtlar düşer; kimlik kümesi ise korunur ki eski bir işlem yeniden
 * gelirse yine tanınsın.
 */
import type { LocalStore } from './backends/WalletBackend';
import type { LedgerEntry } from './types';

const ENTRIES_KEY = 'wallet.ledger.v1';
const IDS_KEY = 'wallet.ledger.ids.v1';
const MAX_ENTRIES = 500;
const MAX_IDS = 5000;

export class Ledger {
  private entries: LedgerEntry[];
  private ids: Set<string>;

  constructor(private readonly store: LocalStore) {
    this.entries = readJson<LedgerEntry[]>(store.get(ENTRIES_KEY), []);
    this.ids = new Set(readJson<string[]>(store.get(IDS_KEY), []));
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  /** Kaydı ekler. Aynı kimlik daha önce işlendiyse hiçbir şey yapmaz ve false döner. */
  add(entry: LedgerEntry): boolean {
    if (this.ids.has(entry.id)) return false;
    this.ids.add(entry.id);
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries = this.entries.slice(-MAX_ENTRIES);
    if (this.ids.size > MAX_IDS) this.ids = new Set([...this.ids].slice(-MAX_IDS));
    this.store.set(ENTRIES_KEY, JSON.stringify(this.entries));
    this.store.set(IDS_KEY, JSON.stringify([...this.ids]));
    return true;
  }

  /** En yeniden eskiye. */
  list(): readonly LedgerEntry[] {
    return [...this.entries].reverse();
  }
}

function readJson<T>(text: string | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
