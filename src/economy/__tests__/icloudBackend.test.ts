/** iCloud deposu: sahte bir native depoyla sınanır. */
import { ICloudKVSWalletBackend, type ICloudChangeReason, type ICloudStore } from '../backends/ICloudKVSWalletBackend';
import { MemoryLocalStore } from '../backends/MemoryWalletBackend';
import { WalletService } from '../WalletService';

/** NSUbiquitousKeyValueStore'un davranışını taklit eden sahte depo. */
function fakeStore() {
  const data = new Map<string, string>();
  const listeners = new Set<(e: { changedKeys: readonly string[]; reason: ICloudChangeReason }) => void>();
  const state = { signedIn: true };
  const store: ICloudStore = {
    isAvailable: () => state.signedIn,
    getAllKeys: () => [...data.keys()],
    getString: (key) => data.get(key) ?? null,
    setString: (key, value) => void data.set(key, value),
    addChangeListener: (callback) => {
      listeners.add(callback);
      return { remove: () => void listeners.delete(callback) };
    },
  };
  return {
    store,
    data,
    state,
    listeners,
    /** Başka bir cihazın yazdığı veri iCloud'dan geldi. */
    arrive(key: string, value: string, reason: ICloudChangeReason = 'serverChange') {
      data.set(key, value);
      for (const listener of listeners) listener({ changedKeys: [key], reason });
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ICloudKVSWalletBackend', () => {
  it('yalnızca istenen önekle başlayan anahtarları okur', async () => {
    const fake = fakeStore();
    fake.data.set('dev.v1.a', '{"x":1}');
    fake.data.set('dev.v1.b', '{"x":2}');
    fake.data.set('settings.theme', 'night');
    const backend = new ICloudKVSWalletBackend(fake.store);
    expect(await backend.readAll('dev.v1.')).toEqual({ 'dev.v1.a': '{"x":1}', 'dev.v1.b': '{"x":2}' });
  });

  it('iCloud kapalıyken okuma boş döner, yazma hata fırlatır', async () => {
    const fake = fakeStore();
    fake.data.set('dev.v1.a', '{}');
    fake.state.signedIn = false;
    const backend = new ICloudKVSWalletBackend(fake.store);
    expect(await backend.isAvailable()).toBe(false);
    expect(await backend.readAll('dev.v1.')).toEqual({});
    await expect(backend.write('dev.v1.a', '{}')).rejects.toThrow(/iCloud/);
    expect(fake.data.get('dev.v1.a')).toBe('{}');
  });

  it('native modül hata fırlatırsa kullanılamıyor sayılır', async () => {
    const fake = fakeStore();
    fake.store.isAvailable = () => {
      throw new Error('modül yok');
    };
    expect(await new ICloudKVSWalletBackend(fake.store).isAvailable()).toBe(false);
  });

  it('değişiklik bildirimini iletir; abonelik bitince iletmez', () => {
    const fake = fakeStore();
    const backend = new ICloudKVSWalletBackend(fake.store);
    let calls = 0;
    const stop = backend.subscribe(() => calls++);
    fake.arrive('dev.v1.b', '{}');
    fake.arrive('dev.v1.b', '{}', 'initialSync');
    expect(calls).toBe(2);
    stop();
    fake.arrive('dev.v1.b', '{}');
    expect(calls).toBe(2);
    expect(fake.listeners.size).toBe(0);
  });

  it('kota aşımı bildirimi işaretlenir', () => {
    const fake = fakeStore();
    const backend = new ICloudKVSWalletBackend(fake.store);
    backend.subscribe(() => {});
    expect(backend.quotaExceeded).toBe(false);
    fake.arrive('dev.v1.b', '{}', 'quotaViolation');
    expect(backend.quotaExceeded).toBe(true);
  });
});

describe('cüzdan + iCloud deposu', () => {
  const walletOn = (fake: ReturnType<typeof fakeStore>, deviceId: string, local = new MemoryLocalStore()) =>
    new WalletService({ deviceId, backend: new ICloudKVSWalletBackend(fake.store), local });

  it('kendi anahtarına yazar; başka cihazdan gelen veri bildirimle birleşir', async () => {
    const fake = fakeStore();
    const wallet = walletOn(fake, 'phone');
    await wallet.start();
    await wallet.recordLevelResult('1', 3);
    expect(JSON.parse(fake.data.get('dev.v1.phone')!).stars).toEqual({ '1': 3 });

    fake.arrive('dev.v1.ipad', JSON.stringify({ schemaVersion: 1, stars: { '2': 3 }, purchases: { tx: 500 } }));
    await settle();
    expect(wallet.getSnapshot().balance.raw).toBe(35 + 35 + 500);
    // iPad'in anahtarına dokunulmadı.
    expect(JSON.parse(fake.data.get('dev.v1.ipad')!).stars).toEqual({ '2': 3 });
  });

  it('iCloud kapalıyken yerelde çalışır; giriş yapılınca gönderir ve birleştirir', async () => {
    const fake = fakeStore();
    fake.state.signedIn = false;
    fake.data.set('dev.v1.ipad', JSON.stringify({ stars: { '9': 3 } }));
    const wallet = walletOn(fake, 'phone');
    await wallet.start();
    await wallet.recordLevelResult('1', 3);
    expect(wallet.getSnapshot()).toMatchObject({ cloudAvailable: false, pendingSync: true });
    expect(wallet.getSnapshot().balance.raw).toBe(35);
    expect(fake.data.has('dev.v1.phone')).toBe(false);

    fake.state.signedIn = true;
    await wallet.sync();
    expect(wallet.getSnapshot()).toMatchObject({ cloudAvailable: true, pendingSync: false });
    expect(wallet.getSnapshot().balance.raw).toBe(70);
    expect(fake.data.has('dev.v1.phone')).toBe(true);
  });

  it('silip yeniden yükleme: aynı cihaz kimliğiyle veri iCloud\'dan geri gelir', async () => {
    const fake = fakeStore();
    const before = walletOn(fake, 'phone');
    await before.start();
    await before.addPurchase('tx-1', 500);
    await before.spend('s1', 60, 'hint');

    const after = walletOn(fake, 'phone');
    await after.start();
    expect(after.getSnapshot().balance.raw).toBe(440);
  });
});
