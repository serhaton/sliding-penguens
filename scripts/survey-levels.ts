/**
 * Keşif aracı: rastgele adayların zorluk ölçütlerinin dağılımını yazdırır.
 * Zorluk eğrisini (src/generator/world1.ts) gerçek verime göre ayarlamak için.
 *
 *   npx tsx scripts/survey-levels.ts [adaySayısı] [tohum]
 */
import { createRng, generateCandidate, measure, type GenParams } from '../src/generator';

const count = Number(process.argv[2] ?? 3000);
const rng = createRng(Number(process.argv[3] ?? 1));

const TURN = { freeIgloos: true, rules: { turnOnBump: true } } as const;
const configs: { name: string; gen: GenParams }[] = [
  { name: 'A · 6x6 · 4 penguen', gen: { width: 6, height: 6, penguins: 4, rocks: 2, water: 1 } },
  { name: 'A · 6x8 · 6 penguen', gen: { width: 6, height: 8, penguins: 6, rocks: 3, water: 2 } },
  { name: 'B (çarpınca dön) · 5x5 · 1 penguen', gen: { width: 5, height: 5, penguins: 1, rocks: 2, water: 0, ...TURN } },
  { name: 'B · 5x6 · 2 penguen', gen: { width: 5, height: 6, penguins: 2, rocks: 2, water: 1, ...TURN } },
  { name: 'B · 6x6 · 3 penguen', gen: { width: 6, height: 6, penguins: 3, rocks: 3, water: 1, ...TURN } },
  { name: 'B · 6x7 · 4 penguen', gen: { width: 6, height: 7, penguins: 4, rocks: 3, water: 1, ...TURN } },
];

const histogram = (values: number[]) => {
  const bins = new Map<number, number>();
  for (const v of values) bins.set(v, (bins.get(v) ?? 0) + 1);
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k}:${n}`).join('  ');
};

for (const { name, gen } of configs) {
  const started = Date.now();
  const all = [];
  let invalid = 0;
  for (let i = 0; i < count; i++) {
    const candidate = generateCandidate(rng, gen);
    const metrics = candidate && measure(candidate);
    if (metrics) all.push(metrics);
    else invalid++;
  }
  const forgiving = all.filter((m) => m.deadEnds === 0);
  const unknown = all.filter((m) => m.deadEnds < 0).length;
  const ms = Date.now() - started;
  console.log(`\n== ${name} — ${count} aday, ${all.length} çözülebilir (${invalid} elendi), ${(ms / count).toFixed(1)} ms/aday`);
  console.log(`   çıkmazsız: ${forgiving.length}   çıkmazlı: ${all.length - forgiving.length - unknown}   bilinmiyor: ${unknown}`);
  console.log(`   engelli penguen (çıkmazsız):  ${histogram(forgiving.map((m) => m.blocked))}`);
  console.log(`   çift dokunuş (çıkmazsız):     ${histogram(forgiving.map((m) => m.extraTaps))}`);
  console.log(`   par (çıkmazsız):              ${histogram(forgiving.map((m) => m.par))}`);
  console.log(`   par (hepsi):                  ${histogram(all.map((m) => m.par))}`);
  console.log(`   en çok durum: ${Math.max(...all.map((m) => m.states))}`);
}
