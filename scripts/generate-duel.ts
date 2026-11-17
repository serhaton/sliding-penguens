/**
 * Düello tahtası üretici (geliştirici aracı). 180° simetrik adaylar üretir,
 * Zor'a karşı Zor maçlarla ölçer ve adil, kilitlenmeyen tahtaları
 * src/data/duel/boards.json dosyasına yazar.
 *
 *   npm run duel:generate                 # rapor (dosyaya yazmaz)
 *   npm run duel:generate -- --write      # 30 tahtayı yaz (yaklaşık 15 dakika sürer)
 *   npm run duel:generate -- --seed 7 --count 30
 *
 * İki aşamalı eleme: önce az maçla kaba eleme (adayların çoğu kilitlenir ve
 * hemen düşer), kalanlar çok maçla doğrulanır. Aynı tohum aynı tahtaları verir.
 * Ölçütler: src/generator/duel.ts → DUEL_CRITERIA
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { simulateBoard, type BoardStats } from '../src/ai/simulate';
import type { LevelDef } from '../src/engine';
import { createRng, DUEL_CRITERIA, duelLayoutKey, generateDuelBoard, passesDuelCriteria } from '../src/generator';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1]! : fallback;
};
const seed = Number(option('seed', '2026'));
const count = Number(option('count', '30'));
const maxTries = Number(option('tries', '250000'));
const write = args.includes('--write');

const rng = createRng(seed);
const started = Date.now();
const boards: { board: LevelDef; stats: BoardStats }[] = [];
const seen = new Set<string>();
let made = 0;
let screened = 0;

console.log('tahta  boyut  ilk  ikinci  berabere  ilk-pay  ort.hamle  en-kısa  sınıra-takılan');
for (let i = 0; i < maxTries && boards.length < count; i++) {
  const width = rng.pick([5, 6]);
  const height = rng.pick([6, 7, 8]);
  const board = generateDuelBoard(rng, {
    width,
    height,
    penguins: 3,
    rockPairs: rng.int(0, 3),
    waterPairs: rng.int(0, 1),
  });
  if (!board) continue;
  made++;
  const layout = duelLayoutKey(board);
  if (seen.has(layout)) continue;

  // 1. aşama: kaba eleme (az maç, gevşek ölçüt).
  const play = { players: ['hard', 'hard'], randomOpening: DUEL_CRITERIA.randomOpening } as const;
  const quick = simulateBoard(board, createRng(seed * 100_003 + i), DUEL_CRITERIA.screenGames, play);
  if (!passesDuelCriteria(quick, 'screen')) continue;
  screened++;

  // 2. aşama: doğrulama (çok maç, asıl ölçüt).
  const stats = simulateBoard(board, createRng(seed * 200_003 + i), DUEL_CRITERIA.verifyGames, play);
  if (!passesDuelCriteria(stats, 'verify')) continue;

  seen.add(layout);
  const id = `duel-${boards.length + 1}`;
  boards.push({ board: { ...board, id }, stats });
  console.log(
    [
      id.padStart(7),
      `${width}x${height}`.padStart(5),
      String(stats.firstWins).padStart(4),
      String(stats.secondWins).padStart(7),
      String(stats.draws).padStart(9),
      `${Math.round(stats.firstWinShare * 100)}%`.padStart(8),
      stats.averageMoves.toFixed(1).padStart(10),
      String(stats.shortestGame).padStart(8),
      `${Math.round(stats.limitRate * 100)}%`.padStart(15),
    ].join(''),
  );
}

const total = boards.reduce(
  (sum, { stats }) => ({
    first: sum.first + stats.firstWins,
    second: sum.second + stats.secondWins,
    draws: sum.draws + stats.draws,
    moves: sum.moves + stats.averageMoves,
  }),
  { first: 0, second: 0, draws: 0, moves: 0 },
);
const decided = total.first + total.second;
console.log(
  `\n${boards.length}/${count} tahta · ${made} aday · ${screened} ön elemeyi geçti · ` +
    `${Math.round((Date.now() - started) / 1000)} sn`,
);
if (boards.length > 0) {
  console.log(
    `Toplam: ilk oynayan %${Math.round((total.first / Math.max(1, decided)) * 100)} · ` +
      `berabere %${Math.round((total.draws / (decided + total.draws)) * 100)} · ` +
      `ortalama ${(total.moves / boards.length).toFixed(1)} hamle`,
  );
}

if (write) {
  if (boards.length < count) {
    console.error(`Yalnızca ${boards.length} tahta bulundu; dosya yazılmadı. --tries değerini artır.`);
    process.exit(1);
  }
  const path = join(__dirname, '../src/data/duel/boards.json');
  writeFileSync(path, `${JSON.stringify(boards.map(({ board }) => board), null, 2)}\n`);
  console.log(`Yazıldı: ${path}`);
}
