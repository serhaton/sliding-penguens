/**
 * Bölüm üretici (geliştirici aracı). Üretilen bölümleri çıkarır, çözücüyle
 * doğrular, zorluk eğrisine göre seçer ve src/data/levels/ altına yazar.
 *
 *   npm run levels:generate -- --part a            # Macera 1 A (sabit yön) raporu
 *   npm run levels:generate -- --part b --write    # Macera 1 B'yi (çarpınca dön) yaz
 *   npm run levels:generate -- --part c --write    # Macera 1 C'yi (dalgalı; ~10 dk sürer)
 *   npm run levels:generate -- --part 2a --write   # Macera 2 A (2a, 2b, 2c, 3a, 3b, 3c)
 *   npm run levels:generate -- --part a --seed 7   # başka bir tohumla dene
 *   npm run levels:generate -- --part c --only 26,28 --write   # yalnızca bu bölümleri yenile
 *
 * Aynı tohum her zaman aynı bölümleri verir. Zorluk eğrileri: src/generator/world1–3.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { handmade2A, handmade3A, handmadeA, handmadeB } from '../src/data/levels/handmade';
import {
  createRng,
  generateWaveLevel,
  selectLevels,
  WORLD1_A_SLOTS,
  WORLD1_B_SLOTS,
  WORLD1_C_LEVELS,
  WORLD2_A_SLOTS,
  WORLD2_B_SLOTS,
  WORLD2_C_LEVELS,
  WORLD3_A_SLOTS,
  WORLD3_B_SLOTS,
  WORLD3_C_LEVELS,
  type Slot,
  type WaveLevelParams,
} from '../src/generator';
import type { LevelDef } from '../src/engine';

type Part =
  | { file: string; slots: readonly Slot[]; handmade: readonly LevelDef[]; candidates: number }
  | { file: string; waves: readonly (WaveLevelParams & { level: number })[] };

const PARTS: Record<string, Part> = {
  a: { file: 'world1-a', slots: WORLD1_A_SLOTS, handmade: handmadeA, candidates: 6000 },
  b: { file: 'world1-b', slots: WORLD1_B_SLOTS, handmade: handmadeB, candidates: 1500 },
  c: { file: 'world1-c', waves: WORLD1_C_LEVELS },
  '2a': { file: 'world2-a', slots: WORLD2_A_SLOTS, handmade: handmade2A, candidates: 1500 },
  '2b': { file: 'world2-b', slots: WORLD2_B_SLOTS, handmade: [], candidates: 1500 },
  '2c': { file: 'world2-c', waves: WORLD2_C_LEVELS },
  '3a': { file: 'world3-a', slots: WORLD3_A_SLOTS, handmade: handmade3A, candidates: 1500 },
  '3b': { file: 'world3-b', slots: WORLD3_B_SLOTS, handmade: [], candidates: 1500 },
  '3c': { file: 'world3-c', waves: WORLD3_C_LEVELS },
};

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1]! : fallback;
};
const part = option('part', 'a');
const config = PARTS[part];
if (!config) {
  console.error(`Bilinmeyen bölüm: ${part}. Seçenekler: ${Object.keys(PARTS).join(', ')}`);
  process.exit(1);
}
const file = join(__dirname, '..', 'src', 'data', 'levels', `${config.file}.json`);
const seed = Number(option('seed', '2026'));
const rng = createRng(seed);
const started = Date.now();
const out: LevelDef[] = [];
let failed = 0;

if ('slots' in config) {
  const { selected, missing } = selectLevels(rng, config.slots, config.handmade, {
    candidatesPerSlot: Number(option('candidates', String(config.candidates))),
    maxSimilarity: 0.4,
  });
  console.log('bölüm  boyut  penguen  par  engelli  park  dönme  çatlak  uyanan  çıkmaz  ilk-doğru  durum  zorluk  uyan');
  for (const { slot, level, metrics: m, matched } of selected) {
    out.push(level);
    console.log(
      [
        String(slot.level).padStart(5),
        `${level.grid[0]!.length}x${level.grid.length}`.padStart(6),
        String(m.penguins).padStart(8),
        String(m.par).padStart(4),
        String(m.blocked).padStart(8),
        String(m.teamwork).padStart(5),
        String(m.spins).padStart(6),
        String(m.cracks).padStart(7),
        String(m.wakes).padStart(7),
        (m.deadEnds < 0 ? '?' : String(m.deadEnds)).padStart(7),
        `${Math.round(m.optimalFirstRatio * 100)}%`.padStart(10),
        String(m.states).padStart(6),
        m.difficulty.toFixed(1).padStart(7),
        String(matched).padStart(5),
      ].join(' '),
    );
  }
  failed = missing.length;
  if (failed > 0) console.log(`\n⚠️  Aday bulunamayan bölümler: ${missing.map((s) => s.level).join(', ')}`);
} else {
  // C'de her bölüm kendi tohumuyla üretilir (tohum + bölüm numarası): tek bir
  // bölümü yenilemek diğerlerini değiştirmez ve dakikalarca beklemek gerekmez.
  const only = option('only', '').split(',').filter(Boolean).map(Number);
  const existing: LevelDef[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const byId = new Map(existing.map((level) => [level.id, level]));

  for (const { level: number, ...params } of config.waves) {
    const id = String(number);
    if (only.length > 0 && !only.includes(number)) {
      const kept = byId.get(id);
      if (kept) out.push(kept);
      else failed++;
      continue;
    }
    const levelRng = createRng(seed * 1000 + number);
    let result = null;
    let boards = 0;
    // Her tahta her dalga dizisine uymaz: uyan bir tahta bulunana kadar dene.
    while (!result && boards < 25) {
      boards++;
      result = generateWaveLevel(levelRng, params);
    }
    if (!result) {
      failed++;
      console.log(`${number}: ✗ ${boards} tahtada uygun bölüm bulunamadı`);
      continue;
    }
    out.push({ ...result.level, id });
    const waves = result.metrics.map((m) => `${m.penguins}p/${m.par}${m.teamwork ? `★${m.teamwork}` : ''}`).join('  ');
    console.log(
      `${number}: ${params.width}x${params.height}, ${result.metrics.length} dalga, toplam par ${result.level.par}, ${boards} tahta denendi\n     ${waves}`,
    );
  }
  console.log('\n(penguen/par, ★ = çözümde "çarpıp durma" sayısı)');
}

console.log(`\nBölüm ${part}, tohum ${seed}, ${((Date.now() - started) / 1000).toFixed(1)} sn`);

if (args.includes('--write')) {
  if (failed > 0) {
    console.error('Eksik bölüm varken dosya yazılmadı.');
    process.exit(1);
  }
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ ${out.length} bölüm yazıldı: ${file}`);
} else {
  console.log('(Rapor modu. Dosyaya yazmak için --write ekle.)');
}
