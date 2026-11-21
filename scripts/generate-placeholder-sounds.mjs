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

/**
 * Sesler arasındaki denge dosyanın içine yazılır: her ses önce aynı tepe
 * düzeyine getirilir, sonra buradaki katsayıyla kısılır (yazılmayan = 1).
 * Oynatıcının ses düzeyi ayarına güvenilmez: cihazda etkisi olmadığı görüldü.
 */
const PEAK = 0.9;
const GAIN = {
  tap: 0.5,
  // Kayma sesi tiz ve hışırtılı: aynı düzeyde diğerlerinden çok daha yüksek duyulur.
  slide: 0.18,
  bump: 0.9,
  star: 0.6,
  crack: 0.8,
  tick: 0.7,
};

function wav(samples, gain = 1) {
  const data = Buffer.alloc(samples.length * 2);
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0) || 1;
  samples.forEach((s, i) => data.writeInt16LE(Math.round((s / peak) * PEAK * gain * 32767), i * 2));
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
  // şans çarkı: ibrenin dilim çivisine çarpması; kısa, tahta gibi bir "tık"
  tick: render(0.05, (t, p) => (noise() * 0.5 * Math.exp(-p * 16) + sine(1700 - 600 * p, t) * Math.exp(-p * 8)) * Math.min(1, p * 60)),
};

// ---------------------------------------------------------------------------
// Fon müziği: ana ekran ve her 10 bölümlük bölge için kısa, neşeli bir ezgi.
// Hepsi 16 ölçüdür ve ek yeri duyulmadan döner.
// ---------------------------------------------------------------------------

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'E5', 'F#4', 'Bb3' → Hz. `key`: yarım ses cinsinden kaydırma. */
const hz = (name, key = 0) => {
  const [, letter, accidental, octave] = /^([A-G])([#b]?)(\d)$/.exec(name);
  const midi = 12 * (Number(octave) + 1) + NOTE[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi + key - 69) / 12);
};

/**
 * Bir parçayı çalar. Ölçü 4/4, en küçük adım sekizlik nota. Ezgiler Do majörde
 * yazılır; `key` hepsini birlikte kaydırır.
 *
 *   bpm     tempo
 *   key     ton kaydırma (yarım ses)
 *   lead    melodi çalgısı: marimba | glock (çan) | musicbox (müzik kutusu) | flute (uzun, yumuşak)
 *   rhythm  eşlik: bounce (bum-çak) | soft (bas + akor arpeji, davulsuz) | tiptoe (seyrek, parmak ucunda) | lazy (ağır, sallanan)
 *   swing   vuruş arası notaların gecikmesi (0 = düz, 0.3 = belirgin sallanma)
 *   bars    her ölçü: { chord: [üç nota], bass: kök, lead: 8 sekizlik (null = sus) }
 *
 * Notaların kuyruğu döngünün sonuna taşarsa baştan devam eder: ek yerinde kesilme olmaz.
 */
function song({ bpm, key = 0, lead = 'marimba', rhythm = 'bounce', swing = 0, bars }) {
  const step = 60 / bpm / 2; // sekizlik nota (sn)
  const n = Math.round(bars.length * 8 * step * RATE);
  const out = new Float32Array(n);
  const add = (at, length, fn) => {
    const start = Math.round(at * RATE);
    const count = Math.floor(length * RATE);
    for (let i = 0; i < count; i++) out[(start + i) % n] += fn(i / RATE, i / count);
  };
  // Tık olmasın diye her nota çok kısa bir yükselişle başlar.
  const attack = (t) => Math.min(1, t * 400);

  const leads = {
    marimba: (at, f) =>
      add(at, 0.7, (t) => (sine(f, t) * Math.exp(-t * 5.5) + 0.45 * sine(f * 4, t) * Math.exp(-t * 22)) * attack(t) * 0.42),
    glock: (at, f) =>
      add(at, 1.1, (t) => (sine(f, t) + 0.3 * sine(f * 2.76, t) * Math.exp(-t * 6)) * Math.exp(-t * 3.6) * attack(t) * 0.36),
    musicbox: (at, f) =>
      add(at, 1.2, (t) => (sine(f, t) + 0.4 * sine(f * 2, t) + 0.18 * sine(f * 3, t) * Math.exp(-t * 9)) * Math.exp(-t * 3.2) * attack(t) * 0.33),
    // Flüt: nota bir sonrakine kadar sürer, hafif titreşimle.
    flute: (at, f, steps) => {
      const length = Math.min(steps, 4) * step * 0.96;
      add(at, length, (t, p) => {
        const env = Math.min(1, t * 16) * Math.min(1, (1 - p) * 9);
        const vib = 1 + 0.004 * Math.sin(TAU * 5.2 * t);
        return (sine(f * vib, t) + 0.22 * sine(f * 2 * vib, t)) * env * 0.26;
      });
    },
  };
  const bass = (at, f, level) =>
    add(at, 0.42, (t) => (sine(f, t) + 0.5 * sine(f * 2, t) + 0.22 * sine(f * 3, t)) * Math.exp(-t * 6) * attack(t) * level);
  const stab = (at, notes, level) =>
    add(at, 0.22, (t) => notes.reduce((sum, f) => sum + sine(f, t) + 0.3 * sine(f * 2, t), 0) * Math.exp(-t * 14) * attack(t) * level);
  const shaker = (at, level) => {
    let last = 0;
    add(at, 0.05, (_t, p) => {
      const x = noise();
      const high = x - last; // tizleri bırakır
      last = x;
      return high * Math.exp(-p * 6) * level;
    });
  };
  const drum = (at, level) => add(at, 0.16, (t, p) => sine(170 - 90 * p, t) * Math.exp(-p * 7) * attack(t) * level);

  bars.forEach((bar, b) => {
    const t0 = b * 8 * step;
    const root = hz(bar.bass, key);
    const chord = bar.chord.map((name) => hz(name, key));
    for (let k = 0; k < 8; k++) {
      const onBeat = k % 2 === 0;
      const at = t0 + k * step + (onBeat ? 0 : swing * step);

      if (rhythm === 'bounce' || rhythm === 'lazy') {
        // "Bum-çak": vuruşta bas, vuruş arasında akor.
        shaker(at, onBeat ? 0.05 : 0.1);
        if (onBeat) bass(at, k % 4 === 0 ? root : root * 1.5, rhythm === 'lazy' ? 0.4 : 0.32);
        else stab(at, chord, 0.06);
        if (k === 0 || k === 4) drum(at, 0.3);
      } else if (rhythm === 'soft') {
        // Davulsuz: bas uzun aralıklarla, akor notaları tek tek.
        if (!onBeat) shaker(at, 0.04);
        if (k === 0) bass(at, root, 0.3);
        if (k === 4) bass(at, root * 1.5, 0.22);
        if (!onBeat) stab(at, [chord[((k - 1) / 2) % 3]], 0.11);
      } else if (rhythm === 'tiptoe') {
        // Parmak ucunda: seyrek bas ve kısa, tek tük akorlar.
        if (!onBeat) shaker(at, 0.05);
        if (k === 0 || k === 4) bass(at, k === 0 ? root : root * 1.5, 0.26);
        if (k === 2 || k === 6) stab(at, chord, 0.05);
      }

      const note = bar.lead[k];
      if (note) {
        // Notanın süresi: bir sonraki notaya (ya da ölçü sonuna) kadar.
        let steps = 1;
        while (k + steps < 8 && !bar.lead[k + steps]) steps++;
        leads[lead](at, hz(note, key), steps);
      }
    }
  });
  return out;
}

const _ = null;
const C = { chord: ['E4', 'G4', 'C5'], bass: 'C3' };
const Am = { chord: ['E4', 'A4', 'C5'], bass: 'A2' };
const F = { chord: ['F4', 'A4', 'C5'], bass: 'F2' };
const G = { chord: ['D4', 'G4', 'B4'], bass: 'G2' };
const Em = { chord: ['E4', 'G4', 'B4'], bass: 'E2' };
const Dm = { chord: ['D4', 'F4', 'A4'], bass: 'D3' };

const tracks = {
  // Ana ekran ve menüler: sıcak, karşılayan bir müzik kutusu ezgisi.
  'music-home': song({
    bpm: 100,
    key: 5,
    lead: 'musicbox',
    bars: [
      { ...C, lead: ['G5', _, 'E5', _, 'G5', _, 'C6', _] },
      { ...G, lead: ['B5', _, _, 'A5', 'G5', _, _, _] },
      { ...Am, lead: ['A5', _, 'C6', _, 'E6', _, 'C6', _] },
      { ...F, lead: ['A5', _, _, 'G5', 'F5', _, _, _] },
      { ...C, lead: ['G5', _, 'E5', _, 'G5', _, 'C6', 'D6'] },
      { ...G, lead: ['D6', _, 'B5', _, 'G5', _, 'B5', _] },
      { ...Am, lead: ['C6', _, 'A5', _, 'E5', _, 'A5', _] },
      { ...F, lead: ['A5', _, 'G5', _, 'F5', _, _, _] },
      { ...F, lead: ['F5', _, 'A5', _, 'C6', _, 'A5', _] },
      { ...G, lead: ['G5', _, 'B5', _, 'D6', _, 'B5', _] },
      { ...C, lead: ['E6', _, _, 'D6', 'C6', _, 'G5', _] },
      { ...Am, lead: ['A5', _, _, 'C6', 'A5', _, 'E5', _] },
      { ...F, lead: ['F5', 'A5', 'C6', 'A5', 'F5', _, 'A5', _] },
      { ...G, lead: ['G5', 'B5', 'D6', 'B5', 'G5', _, 'B5', _] },
      { ...C, lead: ['C6', _, 'E6', _, 'D6', _, 'C6', _] },
      { ...C, lead: ['C6', _, _, _, _, _, 'G5', _] },
    ],
  }),

  // 1A Sakin Kıyı: zıplayan bir marimba ezgisi.
  'music-shore': song({
    bpm: 112.5,
    bars: [
      { ...C, lead: ['E5', _, 'G5', _, 'C6', _, 'G5', 'E5'] },
      { ...Am, lead: ['A5', _, 'C6', 'A5', 'E5', _, _, _] },
      { ...F, lead: ['F5', _, 'A5', _, 'C6', _, 'A5', 'F5'] },
      { ...G, lead: ['G5', _, 'B5', 'D6', 'G5', _, _, _] },
      { ...C, lead: ['E5', _, 'G5', _, 'C6', _, 'E6', 'D6'] },
      { ...Am, lead: ['C6', _, 'A5', _, 'E5', _, 'A5', _] },
      { ...F, lead: ['F5', 'A5', 'C6', 'A5', 'F5', _, 'A5', _] },
      { ...G, lead: ['G5', _, 'B5', _, 'D6', 'B5', 'G5', _] },
      { ...F, lead: ['A5', _, _, 'C6', 'A5', _, 'F5', _] },
      { ...G, lead: ['B5', _, _, 'D6', 'B5', _, 'G5', _] },
      { ...Em, lead: ['G5', _, 'B5', _, 'E6', _, 'B5', 'G5'] },
      { ...Am, lead: ['A5', _, 'C6', _, 'E6', _, _, _] },
      { ...F, lead: ['F5', 'A5', 'C6', 'F6', 'C6', 'A5', 'F5', _] },
      { ...G, lead: ['G5', 'B5', 'D6', 'G6', 'D6', 'B5', 'G5', _] },
      { ...C, lead: ['E6', _, 'D6', _, 'C6', _, 'G5', _] },
      { ...C, lead: ['C6', _, _, _, 'G5', _, _, _] },
    ],
  }),

  // 1B Dönme Buzulu: kendi çevresinde dönen küçük nota halkaları, çan sesiyle.
  'music-spin': song({
    bpm: 120,
    key: 2,
    lead: 'glock',
    bars: [
      { ...Am, lead: ['A5', 'B5', 'C6', 'B5', 'A5', _, 'E5', _] },
      { ...F, lead: ['A5', 'B5', 'C6', 'B5', 'A5', _, 'F5', _] },
      { ...C, lead: ['G5', 'A5', 'B5', 'A5', 'G5', _, 'E5', _] },
      { ...G, lead: ['G5', 'A5', 'B5', 'D6', 'B5', _, 'G5', _] },
      { ...Am, lead: ['C6', 'B5', 'A5', 'B5', 'C6', _, 'E6', _] },
      { ...F, lead: ['C6', 'A5', 'F5', 'A5', 'C6', _, 'F6', _] },
      { ...C, lead: ['E6', 'D6', 'C6', 'D6', 'E6', _, 'G5', _] },
      { ...G, lead: ['D6', 'C6', 'B5', 'C6', 'D6', _, _, _] },
      { ...F, lead: ['F5', _, 'A5', 'C6', _, 'A5', 'F5', _] },
      { ...G, lead: ['G5', _, 'B5', 'D6', _, 'B5', 'G5', _] },
      { ...Am, lead: ['A5', _, 'C6', 'E6', _, 'C6', 'A5', _] },
      { ...Am, lead: ['E6', 'D6', 'C6', 'B5', 'A5', _, _, _] },
      { ...F, lead: ['F5', 'A5', 'C6', 'F6', _, 'C6', 'A5', _] },
      { ...G, lead: ['G5', 'B5', 'D6', 'G6', _, 'D6', 'B5', _] },
      { ...C, lead: ['E6', _, 'C6', _, 'G5', _, 'C6', _] },
      { ...C, lead: ['C6', _, _, _, 'E5', _, 'G5', _] },
    ],
  }),

  // 1C Dalga Koyu: dalga gibi yükselip alçalan ezgi, hafif sallanan ritim.
  'music-waves': song({
    bpm: 104,
    key: -2,
    swing: 0.18,
    bars: [
      { ...C, lead: ['E5', 'G5', 'C6', 'E6', 'C6', 'G5', 'E5', _] },
      { ...Em, lead: ['E5', 'G5', 'B5', 'E6', 'B5', 'G5', 'E5', _] },
      { ...F, lead: ['F5', 'A5', 'C6', 'F6', 'C6', 'A5', 'F5', _] },
      { ...G, lead: ['G5', 'B5', 'D6', 'G6', 'D6', 'B5', 'G5', _] },
      { ...C, lead: ['E6', _, 'D6', 'C6', _, 'G5', _, _] },
      { ...Em, lead: ['B5', _, 'G5', 'E5', _, 'G5', 'B5', _] },
      { ...F, lead: ['A5', _, 'C6', 'A5', _, 'F5', _, _] },
      { ...G, lead: ['B5', _, 'D6', 'B5', _, 'G5', _, _] },
      { ...Am, lead: ['C6', _, 'A5', _, 'E6', _, 'C6', _] },
      { ...Em, lead: ['B5', _, 'G5', _, 'E6', _, 'B5', _] },
      { ...F, lead: ['A5', 'C6', 'F6', 'C6', 'A5', _, 'F5', _] },
      { ...C, lead: ['G5', 'C6', 'E6', 'C6', 'G5', _, 'E5', _] },
      { ...F, lead: ['F5', _, 'A5', _, 'C6', _, 'A5', _] },
      { ...G, lead: ['G5', _, 'B5', _, 'D6', _, 'B5', _] },
      { ...C, lead: ['C6', 'E6', 'G6', 'E6', 'C6', _, 'G5', _] },
      { ...C, lead: ['C6', _, _, _, _, _, _, _] },
    ],
  }),

  // 2A İnce Buz: parmak ucunda, ince ve seyrek çanlar.
  'music-thin': song({
    bpm: 100,
    key: -3,
    lead: 'glock',
    rhythm: 'tiptoe',
    bars: [
      { ...Am, lead: ['E6', _, 'C6', _, 'A5', _, 'C6', _] },
      { ...F, lead: ['F6', _, 'C6', _, 'A5', _, 'C6', _] },
      { ...C, lead: ['E6', _, 'C6', _, 'G5', _, 'C6', _] },
      { ...G, lead: ['D6', _, 'B5', _, 'G5', _, _, _] },
      { ...Am, lead: ['A5', _, 'C6', _, 'E6', _, 'A6', _] },
      { ...F, lead: ['A5', _, 'C6', _, 'F6', _, 'A6', _] },
      { ...C, lead: ['G5', _, 'C6', _, 'E6', _, 'G6', _] },
      { ...G, lead: ['G6', _, 'D6', _, 'B5', _, _, _] },
      { ...Dm, lead: ['D6', _, 'F6', _, 'A5', _, 'D6', _] },
      { ...G, lead: ['D6', _, 'B5', _, 'G5', _, 'B5', _] },
      { ...C, lead: ['E6', _, 'G6', _, 'E6', _, 'C6', _] },
      { ...Am, lead: ['C6', _, 'A5', _, 'E5', _, 'A5', _] },
      { ...Dm, lead: ['F5', 'A5', 'D6', _, 'F6', _, 'D6', _] },
      { ...G, lead: ['G5', 'B5', 'D6', _, 'G6', _, 'D6', _] },
      { ...C, lead: ['E6', _, 'C6', _, 'G5', _, 'E5', _] },
      { ...C, lead: ['C6', _, _, _, _, _, _, _] },
    ],
  }),

  // 2B Kırık Geçit: aksak, vuruş arasına düşen notalarla şakacı bir ezgi.
  'music-pass': song({
    bpm: 124,
    key: 4,
    bars: [
      { ...C, lead: ['C6', _, _, 'E6', _, 'C6', 'G5', _] },
      { ...F, lead: ['A5', _, _, 'C6', _, 'A5', 'F5', _] },
      { ...G, lead: ['B5', _, _, 'D6', _, 'B5', 'G5', _] },
      { ...C, lead: ['C6', _, 'E6', _, 'G6', _, _, _] },
      { ...Am, lead: ['A5', _, _, 'C6', _, 'E6', 'C6', _] },
      { ...F, lead: ['A5', _, _, 'C6', _, 'F6', 'C6', _] },
      { ...G, lead: ['G5', _, _, 'B5', _, 'D6', 'B5', _] },
      { ...G, lead: ['D6', _, 'B5', _, 'G5', _, _, _] },
      { ...C, lead: [_, 'E6', _, 'E6', _, 'D6', 'C6', _] },
      { ...F, lead: [_, 'C6', _, 'C6', _, 'A5', 'F5', _] },
      { ...G, lead: [_, 'D6', _, 'D6', _, 'B5', 'G5', _] },
      { ...Am, lead: [_, 'E6', _, 'E6', _, 'C6', 'A5', _] },
      { ...F, lead: ['F5', 'A5', _, 'C6', 'A5', _, 'F6', _] },
      { ...G, lead: ['G5', 'B5', _, 'D6', 'B5', _, 'G6', _] },
      { ...C, lead: ['E6', _, 'C6', _, 'G5', _, 'C6', _] },
      { ...C, lead: ['C6', _, _, _, 'G5', _, _, _] },
    ],
  }),

  // 2C Buzul Gölü: durgun su; uzun flüt notaları, davulsuz yumuşak eşlik.
  'music-lake': song({
    bpm: 92,
    key: -4,
    lead: 'flute',
    rhythm: 'soft',
    bars: [
      { ...C, lead: ['G5', _, _, _, 'E6', _, _, _] },
      { ...G, lead: ['D6', _, _, _, 'B5', _, _, _] },
      { ...Am, lead: ['C6', _, _, _, 'E6', _, _, _] },
      { ...F, lead: ['C6', _, _, _, 'A5', _, _, _] },
      { ...C, lead: ['G5', _, 'C6', _, 'E6', _, _, _] },
      { ...G, lead: ['G5', _, 'B5', _, 'D6', _, _, _] },
      { ...Am, lead: ['A5', _, 'C6', _, 'E6', _, 'C6', _] },
      { ...F, lead: ['A5', _, _, _, 'F5', _, _, _] },
      { ...F, lead: ['F5', _, 'A5', _, 'C6', _, _, _] },
      { ...C, lead: ['E5', _, 'G5', _, 'C6', _, _, _] },
      { ...F, lead: ['A5', _, 'C6', _, 'F6', _, _, _] },
      { ...G, lead: ['G5', _, 'B5', _, 'D6', _, _, _] },
      { ...Am, lead: ['E6', _, _, _, 'C6', _, 'A5', _] },
      { ...F, lead: ['C6', _, _, _, 'A5', _, _, _] },
      { ...G, lead: ['B5', _, _, _, 'D6', _, _, _] },
      { ...C, lead: ['C6', _, _, _, _, _, _, _] },
    ],
  }),

  // 3A Uykucu Vadi: ağır tempolu bir ninni, müzik kutusuyla.
  'music-valley': song({
    bpm: 88,
    key: 3,
    lead: 'musicbox',
    rhythm: 'soft',
    swing: 0.15,
    bars: [
      { ...C, lead: ['G5', _, 'E6', _, 'D6', _, 'C6', _] },
      { ...Am, lead: ['A5', _, 'E6', _, 'D6', _, 'C6', _] },
      { ...F, lead: ['A5', _, 'C6', _, 'A5', _, 'F5', _] },
      { ...G, lead: ['G5', _, 'B5', _, 'D6', _, _, _] },
      { ...C, lead: ['G5', _, 'E6', _, 'D6', _, 'C6', _] },
      { ...Am, lead: ['A5', _, 'E6', _, 'C6', _, 'A5', _] },
      { ...F, lead: ['F5', _, 'A5', _, 'C6', _, 'A5', _] },
      { ...G, lead: ['B5', _, 'A5', _, 'G5', _, _, _] },
      { ...F, lead: ['C6', _, _, 'A5', 'C6', _, _, _] },
      { ...C, lead: ['E6', _, _, 'C6', 'G5', _, _, _] },
      { ...F, lead: ['C6', _, _, 'A5', 'F6', _, _, _] },
      { ...G, lead: ['D6', _, _, 'B5', 'G5', _, _, _] },
      { ...Am, lead: ['A5', _, 'C6', _, 'E6', _, 'C6', _] },
      { ...F, lead: ['A5', _, 'C6', _, 'F6', _, 'C6', _] },
      { ...G, lead: ['G5', _, 'B5', _, 'D6', _, 'B5', _] },
      { ...C, lead: ['C6', _, _, _, _, _, _, _] },
    ],
  }),

  // 3B Horultu Tepesi: tembel, sallanan, biraz komik bir yürüyüş.
  'music-snore': song({
    bpm: 96,
    key: -5,
    rhythm: 'lazy',
    swing: 0.3,
    bars: [
      { ...C, lead: ['E5', _, 'G5', _, 'A5', _, 'G5', _] },
      { ...C, lead: ['E5', _, 'G5', _, 'A5', 'G5', 'E5', _] },
      { ...F, lead: ['F5', _, 'A5', _, 'C6', _, 'A5', _] },
      { ...F, lead: ['F5', _, 'A5', _, 'C6', 'A5', 'F5', _] },
      { ...C, lead: ['E5', _, 'G5', _, 'C6', _, 'G5', _] },
      { ...C, lead: ['E6', _, 'C6', _, 'G5', _, 'E5', _] },
      { ...G, lead: ['D5', _, 'G5', _, 'B5', _, 'D6', _] },
      { ...G, lead: ['D6', _, 'B5', _, 'G5', _, _, _] },
      { ...C, lead: ['C6', _, _, 'A5', 'G5', _, 'E5', _] },
      { ...C, lead: ['G5', _, _, 'A5', 'C6', _, _, _] },
      { ...F, lead: ['C6', _, _, 'A5', 'F5', _, 'A5', _] },
      { ...F, lead: ['C6', _, _, 'D6', 'C6', _, _, _] },
      { ...G, lead: ['B5', _, 'D6', _, 'G6', _, 'D6', _] },
      { ...G, lead: ['B5', _, 'A5', _, 'G5', _, 'D5', _] },
      { ...C, lead: ['E5', 'G5', 'C6', _, 'E6', _, 'C6', _] },
      { ...C, lead: ['C6', _, _, _, _, _, _, _] },
    ],
  }),

  // 3C Rüya Koyu: son bölge; ışıltılı, rüya gibi bir çan ezgisi.
  'music-dream': song({
    bpm: 104,
    key: 1,
    lead: 'glock',
    bars: [
      { ...F, lead: ['A5', _, 'C6', _, 'F6', _, 'E6', _] },
      { ...G, lead: ['D6', _, 'B5', _, 'G5', _, _, _] },
      { ...Em, lead: ['G5', _, 'B5', _, 'E6', _, 'D6', _] },
      { ...Am, lead: ['C6', _, 'A5', _, 'E5', _, _, _] },
      { ...F, lead: ['A5', _, 'C6', _, 'F6', _, 'A6', _] },
      { ...G, lead: ['G6', _, 'D6', _, 'B5', _, 'D6', _] },
      { ...C, lead: ['E6', _, 'C6', _, 'G5', _, 'C6', _] },
      { ...C, lead: ['E6', _, _, _, _, _, _, _] },
      { ...F, lead: ['F6', _, 'E6', _, 'C6', _, 'A5', _] },
      { ...G, lead: ['G6', _, 'D6', _, 'B5', _, 'G5', _] },
      { ...Em, lead: ['E6', _, 'D6', _, 'B5', _, 'G5', _] },
      { ...Am, lead: ['A5', _, 'C6', _, 'E6', _, _, _] },
      { ...F, lead: ['F5', 'A5', 'C6', 'F6', _, 'C6', 'A5', _] },
      { ...G, lead: ['G5', 'B5', 'D6', 'G6', _, 'D6', 'B5', _] },
      { ...C, lead: ['C6', _, 'E6', _, 'G6', _, 'E6', _] },
      { ...C, lead: ['C6', _, _, _, _, _, _, _] },
    ],
  }),
};
/** Fon müziği efektlerin altında kalmalı: düzeyi dosyaya yazılır. */
const MUSIC_GAIN = 0.26;
/** Uzun notalı parçalar aynı tepe düzeyinde daha yüksek duyulur: onlar ayrıca kısılır. */
const TRACK_GAIN = { 'music-lake': 0.5 };

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(tracks)) {
  writeFileSync(join(OUT, `${name}.wav`), wav(samples, MUSIC_GAIN * (TRACK_GAIN[name] ?? 1)));
  console.log(`✓ ${name}.wav (${(samples.length / RATE).toFixed(1)} sn, döngü)`);
}
for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(join(OUT, `${name}.wav`), wav(samples, GAIN[name] ?? 1));
  console.log(`✓ ${name}.wav (${(samples.length / RATE).toFixed(2)} sn)`);
}
