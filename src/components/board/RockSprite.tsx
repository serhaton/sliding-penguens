/** Kaya: tepesinde kar olan yuvarlak hatlı bir taş. Tuval içinde kullanılır. */
import { Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { BOARD } from './palette';

export function RockSprite({ x, y, size }: { x: number; y: number; size: number }) {
  const shapes = useMemo(() => {
    const body = Skia.PathBuilder.Make()
      .moveTo(14, 82).cubicTo(6, 60, 20, 30, 42, 24).cubicTo(60, 18, 84, 34, 88, 60)
      .cubicTo(90, 74, 86, 82, 80, 84).lineTo(20, 84).close().detach();
    // Sağ alttaki gölgeli yüz.
    const shade = Skia.PathBuilder.Make()
      .moveTo(58, 84).cubicTo(66, 70, 70, 52, 62, 36).cubicTo(78, 40, 88, 52, 88, 62)
      .cubicTo(90, 74, 86, 82, 80, 84).close().detach();
    const snow = Skia.PathBuilder.Make()
      .moveTo(22, 46).cubicTo(26, 30, 36, 24, 44, 23).cubicTo(58, 19, 72, 28, 78, 40)
      .quadTo(72, 46, 66, 40).quadTo(58, 48, 50, 40).quadTo(42, 50, 34, 42)
      .quadTo(28, 50, 22, 46).close().detach();
    return { body, shade, snow };
  }, []);

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: size / 100 }]}>
      <Oval x={12} y={78} width={78} height={12} color={BOARD.shadow} opacity={0.14} />
      <Path path={shapes.body} color={BOARD.rock} />
      <Path path={shapes.shade} color={BOARD.rockDark} />
      <Oval x={24} y={54} width={14} height={8} color={BOARD.rockLight} opacity={0.8} />
      <Path path={shapes.snow} color={BOARD.snow} />
    </Group>
  );
}
