/**
 * Penguenin hareketi: saatten (ms) türetilen, UI iş parçacığında çalışan saf
 * hesap. Kişilik boşta animasyonu, poz ise genel duruşu belirler.
 *
 * Tek bir `computeMotion` her karede bütün değerleri üretir; bileşen bunları
 * gövde, yüz, kanat ve ayak dönüşümlerine dağıtır.
 */
import type { Personality } from '@/data/characters';

import type { Pose } from './types';

export interface Motion {
  /** Gövde: dikey kayma (tasarım birimi), dönme (radyan), esneme. */
  ty: number;
  rot: number;
  sx: number;
  sy: number;
  /** Yüzün kafa içindeki kayması: bakış yönü. */
  lookX: number;
  lookY: number;
  /** Göz açıklığı (1 açık, ~0 kapalı). */
  eyeOpen: number;
  /** Kanat açıları (radyan; 0 = gövdeye yapışık). */
  wingL: number;
  wingR: number;
  /** Ayakların yerden yüksekliği. */
  footL: number;
  footR: number;
  /** Gaga açıklığı (0 kapalı, 1 tam açık): esneme. */
  mouth: number;
  /** Yanak kızarıklığı çarpanı. */
  blush: number;
}

const TAU = Math.PI * 2;

/** 0–1 arası bir "pencere": her `every` ms'de bir `length` ms sürer; dışında -1. */
function windowPhase(t: number, every: number, length: number, offset = 0): number {
  'worklet';
  const p = ((t + offset) % every) / length;
  return p < 1 ? p : -1;
}

export function computeMotion(t: number, personality: Personality, pose: Pose, hop: number): Motion {
  'worklet';
  const m: Motion = {
    ty: 0, rot: 0, sx: 1, sy: 1,
    lookX: 0, lookY: 0, eyeOpen: 1,
    wingL: 0, wingR: 0, footL: 0, footR: 0,
    mouth: 0, blush: 1,
  };

  // --- Poz: uyku ---
  if (pose === 'sleep') {
    const breath = Math.sin((t / 4200) * TAU);
    m.sx = 1.03 - breath * 0.015;
    m.sy = 0.95 + breath * 0.03;
    m.lookY = 3;
    m.eyeOpen = 0;
    return m;
  }

  // --- Poz: dans ---
  if (pose === 'dance') {
    const beat = (t / 520) * TAU;
    m.ty = -7 * Math.abs(Math.sin(beat / 2));
    m.rot = 0.13 * Math.sin(beat / 2);
    m.sy = 1 + 0.04 * Math.abs(Math.sin(beat / 2));
    m.wingL = 1.1 + 0.5 * Math.sin(beat);
    m.wingR = 1.1 - 0.5 * Math.sin(beat);
    m.footL = Math.max(0, Math.sin(beat / 2)) * 4;
    m.footR = Math.max(0, -Math.sin(beat / 2)) * 4;
    m.lookX = 2 * Math.sin(beat / 2);
    return m;
  }

  // --- Boşta: herkeste ortak nefes, sallanma, göz kırpma ---
  let breathMs = 2600;
  let swayAmp = 0.035;
  let blinkEvery = 3400;
  let blinkMs = 160;
  let flapEvery = 6800;
  if (personality === 'sleepy') { breathMs = 3800; blinkEvery = 2600; blinkMs = 320; }
  if (personality === 'hasty') { breathMs = 1700; swayAmp = 0.02; }
  if (personality === 'shy') { swayAmp = 0.05; }
  if (personality === 'proud') { swayAmp = 0.015; }
  if (personality === 'cheerful') { flapEvery = 3000; }

  const breath = Math.sin((t / breathMs) * TAU);
  m.rot = Math.sin((t / 5200) * TAU) * swayAmp;
  m.sx = 1 - breath * 0.012;
  m.sy = 1 + breath * 0.02;

  const blink = windowPhase(t, blinkEvery, blinkMs);
  if (blink >= 0) m.eyeOpen = Math.max(0.08, Math.abs(1 - 2 * blink));

  const flap = windowPhase(t, flapEvery, 700);
  if (flap >= 0) {
    const wave = Math.abs(Math.sin(flap * Math.PI * 3)) * (1 - flap) * 0.5;
    m.wingL = wave;
    m.wingR = wave;
  }

  // --- Kişiliğe özgü küçük hareketler ---
  if (personality === 'curious') {
    // Sola bakar, bekler, sağa bakar.
    m.lookX = 5 * Math.max(-1, Math.min(1, 1.7 * Math.sin((t / 5600) * TAU)));
  } else if (personality === 'hasty') {
    // Sabırsız ayak vurma: 3,2 sn'de bir 1,4 sn.
    const tap = windowPhase(t, 3200, 1400);
    if (tap >= 0) m.footR = Math.max(0, Math.sin(tap * Math.PI * 8)) * 3.5;
  } else if (personality === 'shy') {
    // Bakışını kaçırır, o sırada daha çok kızarır.
    const away = Math.max(0, Math.min(1, 2 * Math.sin((t / 7000) * TAU)));
    m.lookX = -4.5 * away;
    m.lookY = 2 * away;
    m.blush = 1 + 0.5 * away;
  } else if (personality === 'cheerful') {
    // Yerinde çifte zıplama.
    const bounce = windowPhase(t, 4200, 640, 1500);
    if (bounce >= 0) m.ty = -4.5 * Math.abs(Math.sin(bounce * Math.PI * 2));
  } else if (personality === 'sleepy') {
    // Kafası düşer; ara sıra uzun uzun esner.
    m.lookY = 2 + 1.5 * breath;
    const yawn = windowPhase(t, 7200, 1500, 2000);
    if (yawn >= 0) {
      const open = Math.sin(yawn * Math.PI);
      m.mouth = open;
      m.eyeOpen = Math.min(m.eyeOpen, 1 - open * 0.92);
      m.sy += open * 0.03;
    }
  } else if (personality === 'proud') {
    // Göğsünü kabartır, çenesini kaldırır.
    const puff = Math.max(0, Math.sin((t / 4600) * TAU));
    m.sx += puff * 0.035;
    m.lookY = -1.5 - puff * 1.5;
  }

  // --- Poz: el sallama (sağ kanat havada) ---
  if (pose === 'wave') {
    m.wingR = 1.9 + 0.35 * Math.sin((t / 280) * TAU);
    m.ty += -1.5 * Math.abs(Math.sin((t / 560) * TAU));
  }

  // --- Dokunma zıplaması: her şeyin üstüne biner ---
  if (hop > 0) {
    m.ty -= hop * 14;
    m.sx -= hop * 0.05;
    m.sy += hop * 0.07;
    m.wingL = Math.max(m.wingL, hop * 0.9);
    m.wingR = Math.max(m.wingR, hop * 0.9);
  }
  return m;
}
