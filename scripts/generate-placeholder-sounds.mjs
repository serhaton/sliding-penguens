/**
 * Yer tutucu ses üretici. Gerçek sesler gelene kadar oyunun sessiz kalmaması
 * için basit sentez sesleri (sinüs + gürültü) üretip assets/sounds/ altına yazar.
 *
 *   node scripts/generate-placeholder-sounds.mjs
 *
 * Gerçek ses dosyası geldiğinde aynı adla (.wav) üstüne yazmak yeterli;
 * gereken seslerin tam listesi assets/sounds/README.md dosyasında.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/** Tohumlu gürültü: her çalıştırmada aynı dosyalar çıksın. */
let seed = 12345;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return (seed / 4294967296) * 2 - 1;
};

/** `fn(t, p)` → [-1, 1] örnek; t saniye, p 0–1 ilerleme. */
function render(seconds, fn) {
  const n = Math.floor(seconds * RATE);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = fn(i / RATE, i / n);
  return samples;
}

/** Her ses aynı tepe düzeyine getirilir; aralarındaki denge audio.ts'teki ses düzeyleriyle kurulur. */
const PEAK = 0.9;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0) || 1;
  samples.forEach((s, i) => data.writeInt16LE(Math.round((s / peak) * PEAK * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const TAU = Math.PI * 2;
const sine = (f, t) => Math.sin(TAU * f * t);
/** Yumuşak başlangıçlı, üstel sönümlü zarf. */
const pluck = (p, sharp = 5) => Math.min(1, p * 40) * Math.exp(-p * sharp);
/** Bir notayı `start` saniyesinde çalan çan sesi. */
const bell = (f, t, start, length) => {
  const local = t - start;
  if (local < 0 || local > length) return 0;
  const p = local / length;
  return (sine(f, local) + 0.35 * sine(f * 2, local)) * pluck(p, 4) * 0.6;
};

// Kayma sesi için iki alçak geçirgen süzgeç: farkları orta-tiz bir bant verir.
let fast = 0;
let slow = 0;
const sounds = {
  // "pıt": kısa, yükselen blip
  tap: render(0.07, (t, p) => sine(820 + 500 * p, t) * pluck(p, 4)),
  // "vıııın": parlak hışırtı + yükselen ince ton. Telefon hoparlöründe de
  // duyulsun diye alçak frekanslarda değil, 1–4 kHz bandında.
  slide: render(0.42, (t, p) => {
    const n = noise();
    fast += (n - fast) * 0.55;
    slow += (n - slow) * 0.12;
    const hiss = (fast - slow) * 1.4;
    const tone = sine(620 + 520 * p, t) * 0.35;
    return (hiss + tone) * Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 0.7;
  }),
  // yumuşak "tok"
  bump: render(0.16, (t, p) => sine(150 - 60 * p, t) * pluck(p, 6) * 1.2),
  // igloya giriş: neşeli "ding"
  enter: render(0.5, (t) => bell(1318.5, t, 0, 0.5) + bell(1760, t, 0.07, 0.43)),
  // bölüm sonu: kısa melodi (do–mi–sol–do)
  win: render(1.0, (t) =>
    bell(523.25, t, 0, 0.5) + bell(659.25, t, 0.13, 0.5) + bell(783.99, t, 0.26, 0.5) + bell(1046.5, t, 0.39, 0.6)),
  // yıldız düşmesi
  star: render(0.3, (t) => bell(1567.98, t, 0, 0.3)),
  // "hayır": iki alçak blip
  nope: render(0.22, (t, p) => sine(210, t) * (p < 0.4 ? pluck(p / 0.4, 3) : pluck((p - 0.5) / 0.5, 3) * (p > 0.5 ? 1 : 0))),
  // çatlak buz: kısa çıtırtı
  crack: render(0.18, (_t, p) => (Math.abs(noise()) > 0.86 ? noise() : noise() * 0.12) * Math.exp(-p * 5)),
  // uyanma: yükselen cıvıltı
  wake: render(0.28, (t, p) => sine(500 + 900 * p * p, t) * Math.sin(Math.PI * p) * 0.8),
};

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(join(OUT, `${name}.wav`), wav(samples));
  console.log(`✓ ${name}.wav (${(samples.length / RATE).toFixed(2)} sn)`);
}
