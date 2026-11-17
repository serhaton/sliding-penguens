import { en } from '../en';
import { interpolate, resolveLanguage } from '../locale';
import { tr } from '../tr';

describe('resolveLanguage', () => {
  it('kullanıcı açıkça seçtiyse cihaz dilini yok sayar', () => {
    expect(resolveLanguage('tr', ['en'])).toBe('tr');
    expect(resolveLanguage('en', ['tr'])).toBe('en');
  });

  it('otomatik modda cihaz dilini kullanır', () => {
    expect(resolveLanguage('system', ['tr'])).toBe('tr');
    expect(resolveLanguage('system', ['en'])).toBe('en');
  });

  it('bölge ekli ve büyük harfli kodları tanır', () => {
    expect(resolveLanguage('system', ['tr-TR'])).toBe('tr');
    expect(resolveLanguage('system', ['EN_us'])).toBe('en');
  });

  it('listede desteklenen ilk dili seçer (ilk dili değil)', () => {
    expect(resolveLanguage('system', ['de', 'tr', 'en'])).toBe('tr');
  });

  it('desteklenen dil yoksa İngilizceye döner', () => {
    expect(resolveLanguage('system', ['de', 'fr'])).toBe('en');
    expect(resolveLanguage('system', [])).toBe('en');
    expect(resolveLanguage('system', [null, undefined])).toBe('en');
  });
});

describe('interpolate', () => {
  it('yer tutucuları doldurur', () => {
    expect(interpolate('Bölüm {n}', { n: 12 })).toBe('Bölüm 12');
    expect(interpolate('{a} - {b}', { a: 'x', b: 2 })).toBe('x - 2');
  });

  it('eksik değeri olduğu gibi bırakır', () => {
    expect(interpolate('Bölüm {n}')).toBe('Bölüm {n}');
    expect(interpolate('Bölüm {n}', {})).toBe('Bölüm {n}');
  });
});

describe('çeviri dosyaları', () => {
  const trKeys = Object.keys(tr).sort();
  const enKeys = Object.keys(en).sort();

  it('iki dilde aynı anahtarlar var', () => {
    expect(enKeys).toEqual(trKeys);
  });

  it('boş metin yok', () => {
    for (const dict of [tr, en] as Record<string, string>[]) {
      for (const [key, value] of Object.entries(dict)) {
        expect([key, value.trim().length > 0]).toEqual([key, true]);
      }
    }
  });

  it('iki dilde aynı yer tutucular kullanılıyor', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of trKeys) {
      expect([key, placeholders((en as Record<string, string>)[key]!)]).toEqual([
        key,
        placeholders((tr as Record<string, string>)[key]!),
      ]);
    }
  });
});
