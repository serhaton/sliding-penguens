/**
 * Igloo: kar bloklarından kubbe, sahibinin renginde kapı kemeri ve bayrak.
 * Bayrakta renk körlüğü sembolü var. Tuval içinde kullanılır.
 */
import { Group, Line, Oval, Path, RoundedRect, Skia, useClock, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { symbolForColor } from '@/data/characters';
import type { PenguinColor } from '@/engine/types';
import { penguinColors } from '@/theme/colors';

import { BOARD } from './palette';
import { SymbolMark, symbolPath } from './symbols';

export interface IglooSpriteProps {
  x: number;
  y: number;
  size: number;
  /** Sahibinin rengi (tek oyunculuda penguen rengi, düelloda takım rengi). */
  color: PenguinColor;
  largeSymbol?: boolean;
  /** Bacadan kalp duman çıksın (penguen içeri girince). */
  smoking?: boolean;
}

export function IglooSprite({ x, y, size, color, largeSymbol = false, smoking = false }: IglooSpriteProps) {
  const tone = penguinColors[color];
  const clock = useClock();

  const shapes = useMemo(() => {
    const dome = Skia.PathBuilder.Make()
      .moveTo(8, 88).cubicTo(8, 22, 92, 22, 92, 88).close().detach();
    // Kubbenin sağ yanındaki gölge hilali.
    const shade = Skia.PathBuilder.Make()
      .moveTo(92, 88).cubicTo(92, 50, 76, 36, 62, 34).cubicTo(74, 46, 80, 64, 78, 88).close().detach();
    // Kar blokları: iki yatay sıra + şaşırtmalı dikey derzler.
    const blocks = Skia.PathBuilder.Make()
      .moveTo(8, 70).lineTo(92, 70)
      .moveTo(14, 54).lineTo(86, 54)
      .moveTo(22, 70).lineTo(22, 88).moveTo(78, 70).lineTo(78, 88)
      .moveTo(30, 54).lineTo(30, 70).moveTo(50, 40).lineTo(50, 54).moveTo(70, 54).lineTo(70, 70)
      .detach();
    const arch = (inset: number) =>
      Skia.PathBuilder.Make()
        .moveTo(32 + inset, 88).lineTo(32 + inset, 70)
        .cubicTo(32 + inset, 50 + inset, 68 - inset, 50 + inset, 68 - inset, 70)
        .lineTo(68 - inset, 88).close().detach();
    const flag = Skia.PathBuilder.Make()
      .moveTo(24, 8).lineTo(48, 11).quadTo(45, 17.5, 48, 24).lineTo(24, 27).close().detach();
    return { dome, shade, blocks, frame: arch(0), door: arch(6), flag };
  }, []);

  // Bayrak hafifçe dalgalanır.
  const flagWave = useDerivedValue(() => [{ skewY: Math.sin(clock.value / 500) * 0.08 }]);
  const symbolR = largeSymbol ? 7 : 5;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: size / 100 }]}>
      <Oval x={6} y={82} width={88} height={13} color={BOARD.shadow} opacity={0.14} />

      {/* Baca (kubbenin arkasında) */}
      <RoundedRect x={62} y={24} width={12} height={18} r={3} color={BOARD.snowShade} />

      <Path path={shapes.dome} color={BOARD.snow} />
      <Path path={shapes.shade} color={BOARD.snowShade} />
      <Group clip={shapes.dome}>
        <Path path={shapes.blocks} color={BOARD.snowLine} style="stroke" strokeWidth={1.8} strokeCap="round" />
      </Group>

      {/* Kapı: renkli kemer + koyu iç */}
      <Path path={shapes.frame} color={tone.main} />
      <Path path={shapes.door} color={BOARD.door} />

      {/* Bayrak: renk + sembol */}
      <Line p1={vec(24, 42)} p2={vec(24, 7)} color={BOARD.pole} strokeWidth={2.6} strokeCap="round" />
      <Group transform={flagWave} origin={vec(24, 17)}>
        <Path path={shapes.flag} color={tone.main} />
        <SymbolMark kind={symbolForColor(color)} cx={35} cy={17.5} r={symbolR} />
      </Group>

      {smoking && [0, 1, 2].map((i) => <HeartPuff key={i} clock={clock} index={i} />)}
    </Group>
  );
}

/** Bacadan yükselip kaybolan kalp şeklinde duman. */
function HeartPuff({ clock, index }: { clock: SharedValue<number>; index: number }) {
  const phase = useDerivedValue(() => (clock.value / 2400 + index / 3) % 1);
  const transform = useDerivedValue(() => [
    { translateX: 68 + Math.sin(phase.value * Math.PI * 2 + index) * 5 },
    { translateY: 20 - phase.value * 26 },
    { scale: 3 + phase.value * 4 },
  ]);
  const opacity = useDerivedValue(() => Math.sin(phase.value * Math.PI) * 0.9);
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={symbolPath('heart')} color={BOARD.smoke} />
    </Group>
  );
}
