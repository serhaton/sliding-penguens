import {
  clampAxis,
  coastline,
  focusCamera,
  insidePolygon,
  mapLayout,
  overviewCamera,
} from '@/components/map/layout';
import type { LevelDef } from '@/engine';

import { computeProgress } from '../progress';

jest.mock('@/economy/wallet', () => ({ useWallet: jest.fn() }));

const levels = ['1', '2', '3', '4'].map((id) => ({ id }) as LevelDef);

describe('ilerleme', () => {
  it('ilk açılışta 1. bölüm sıradadır, gerisi kilitlidir', () => {
    const p = computeProgress({}, levels);
    expect(p.fresh).toBe(true);
    expect(p.currentId).toBe('1');
    expect(p.currentNumber).toBe(1);
    expect(p.statusOf('1')).toBe('current');
    expect(p.statusOf('2')).toBe('locked');
    expect(p.totalStars).toBe(0);
    expect(p.maxStars).toBe(12);
  });

  it('bitirilen bölümden sonraki açılır', () => {
    const p = computeProgress({ '1': 3, '2': 1 }, levels);
    expect(p.fresh).toBe(false);
    expect(p.currentId).toBe('3');
    expect(p.statusOf('1')).toBe('done');
    expect(p.statusOf('2')).toBe('done');
    expect(p.statusOf('3')).toBe('current');
    expect(p.statusOf('4')).toBe('locked');
    expect(p.totalStars).toBe(4);
  });

  it('sıra atlanamaz: aradaki bölüm bitmeden sonrası kilitli kalır', () => {
    // Başka bir cihazdan gelen tutarsız veri: 3 bitmiş ama 2 bitmemiş.
    const p = computeProgress({ '1': 2, '3': 3 }, levels);
    expect(p.currentId).toBe('2');
    expect(p.statusOf('3')).toBe('locked');
    // Yıldızlar yine de sayılır (coinleri verilmiştir).
    expect(p.starsOf('3')).toBe(3);
  });

  it('hepsi bitince son bölüm sırada görünür ama "bitti" sayılır', () => {
    const p = computeProgress({ '1': 1, '2': 1, '3': 1, '4': 2 }, levels);
    expect(p.allDone).toBe(true);
    expect(p.currentId).toBe('4');
    expect(p.statusOf('4')).toBe('done');
  });

  it('bozuk yıldız değerlerini 0–3 arasına sıkıştırır', () => {
    const p = computeProgress({ '1': 9, '2': -2 }, levels);
    expect(p.starsOf('1')).toBe(3);
    expect(p.starsOf('2')).toBe(0);
    expect(p.currentId).toBe('2');
  });

  it('bilinmeyen bölüm kilitlidir', () => {
    expect(computeProgress({}, levels).statusOf('yok')).toBe('locked');
  });
});

describe('harita yerleşimi', () => {
  const SIZE = 1800;
  const counts = [30, 30, 30];
  const layout = mapLayout(counts, SIZE);
  const coast = coastline(SIZE);

  it('bütün episodeların düğümleri kıtaya sığar', () => {
    expect(layout.nodes).toHaveLength(90);
    expect(layout.episodeOf.filter((w) => w === 0)).toHaveLength(30);
    expect(layout.episodeOf.filter((w) => w === 2)).toHaveLength(30);
  });

  it('her düğüm kıtanın içindedir', () => {
    for (const node of layout.nodes) expect(insidePolygon(node, coast)).toBe(true);
  });

  it('düğümler birbirine dokunmaz', () => {
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const a = layout.nodes[i]!;
        const b = layout.nodes[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(76);
      }
    }
  });

  it('yol güneyden başlar; episodelar alt alta kuşaklardır', () => {
    const [w1, w2, w3] = layout.episodes;
    expect(w1!.bottom).toBe(SIZE);
    expect(w1!.top).toBe(w2!.bottom);
    expect(w2!.top).toBe(w3!.bottom);
    expect(w3!.top).toBe(0);
    layout.nodes.forEach((node, i) => {
      const band = layout.episodes[layout.episodeOf[i]!]!;
      expect(node.y).toBeLessThan(band.bottom);
      expect(node.y).toBeGreaterThan(band.top);
    });
  });

  it('her iki düğüm arasında ayak izi vardır', () => {
    expect(layout.trail).toHaveLength(89);
    expect(layout.trail.every((dots) => dots.length > 0)).toBe(true);
  });

  it('sığmayan haritada hata verir', () => {
    expect(() => mapLayout([500], 400)).toThrow();
  });

  it('uzak görünüm kıtanın tamamını pencereye sığdırıp ortalar', () => {
    const view = { width: 400, height: 700 };
    const camera = overviewCamera(2000, view);
    expect(camera.scale).toBe(0.2);
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(150);
    // Kenar payı verilince ortadaki kısım sığdırılır; içerik ortalı kalır.
    const inner = overviewCamera(2000, view, 500);
    expect(inner.scale).toBe(0.4);
    expect(inner.x).toBe(-200);
    expect(inner.y).toBe(-50);
  });

  it('odak kamerası noktayı ortalar ama kenardan boşluk göstermez', () => {
    const view = { width: 400, height: 700 };
    expect(focusCamera({ x: 1000, y: 1000 }, 2000, view)).toEqual({ scale: 1, x: -800, y: -650 });
    expect(focusCamera({ x: 0, y: 0 }, 2000, view)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(focusCamera({ x: 2000, y: 2000 }, 2000, view)).toEqual({ scale: 1, x: -1600, y: -1300 });
  });

  it('öteleme sınırı: küçük içerik ortalanır, büyük içerik kenara yapışır', () => {
    expect(clampAxis(-50, 300, 400)).toBe(50);
    expect(clampAxis(40, 1000, 400)).toBe(0);
    expect(clampAxis(-900, 1000, 400)).toBe(-600);
    expect(clampAxis(-200, 1000, 400)).toBe(-200);
  });
});
