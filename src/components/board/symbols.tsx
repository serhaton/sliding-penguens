/**
 * Renk körlüğü sembolleri (daire, üçgen, kalp, yıldız, karo, kare).
 * Her sembol (0,0) merkezli, yarıçapı 1 olan bir yoldur; çizerken ölçeklenir.
 */
import { Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';

import type { SymbolKind } from '@/data/characters';

function build(kind: SymbolKind): SkPath {
  const b = Skia.PathBuilder.Make();
  switch (kind) {
    case 'circle':
      b.addCircle(0, 0, 0.9);
      break;
    case 'square':
      b.addPoly([{ x: -0.8, y: -0.8 }, { x: 0.8, y: -0.8 }, { x: 0.8, y: 0.8 }, { x: -0.8, y: 0.8 }], true);
      break;
    case 'diamond':
      b.addPoly([{ x: 0, y: -1.05 }, { x: 0.85, y: 0 }, { x: 0, y: 1.05 }, { x: -0.85, y: 0 }], true);
      break;
    case 'triangle':
      b.addPoly([{ x: 0, y: -1 }, { x: 1, y: 0.8 }, { x: -1, y: 0.8 }], true);
      break;
    case 'star': {
      const points = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? 1.1 : 0.48;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      });
      b.addPoly(points, true);
      break;
    }
    case 'heart':
      b.moveTo(0, 0.95)
        .cubicTo(-1.5, -0.1, -0.85, -1.15, 0, -0.4)
        .cubicTo(0.85, -1.15, 1.5, -0.1, 0, 0.95)
        .close();
      break;
  }
  return b.detach();
}

const cache = new Map<SymbolKind, SkPath>();

export function symbolPath(kind: SymbolKind): SkPath {
  let path = cache.get(kind);
  if (!path) {
    path = build(kind);
    cache.set(kind, path);
  }
  return path;
}

export function SymbolMark({
  kind,
  cx,
  cy,
  r,
  color = '#FFFFFF',
}: {
  kind: SymbolKind;
  cx: number;
  cy: number;
  r: number;
  color?: string;
}) {
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { scale: r }]}>
      <Path path={symbolPath(kind)} color={color} />
    </Group>
  );
}
