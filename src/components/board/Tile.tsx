/**
 * Zemin karosu: buz, çatlak buz ya da su. Tuval içinde kullanılır.
 * Kaya da zemin tipidir ama buzun üstünde duran bir nesne gibi çizilir
 * (bkz. RockSprite); altına normal buz karosu konur.
 */
import { Group, Line, Path, RoundedRect, Skia, useClock, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import type { CellType } from '@/engine/types';

import { BOARD } from './palette';

export interface TileProps {
  x: number;
  y: number;
  size: number;
  type: CellType;
  /** Dama deseni için: komşu karolardan bir ton farklı. */
  alt?: boolean;
}

export function Tile({ x, y, size, type, alt = false }: TileProps) {
  const placement = [{ translateX: x }, { translateY: y }, { scale: size / 100 }];
  return (
    <Group transform={placement}>
      {type === 'water' ? <Water /> : <Ice alt={alt} cracked={type === 'cracked'} />}
    </Group>
  );
}

function Ice({ alt, cracked }: { alt: boolean; cracked: boolean }) {
  const crack = useMemo(
    () =>
      Skia.PathBuilder.Make()
        .moveTo(18, 30).lineTo(38, 42).lineTo(34, 58).lineTo(54, 62).lineTo(70, 82)
        .moveTo(38, 42).lineTo(56, 30).lineTo(74, 34)
        .moveTo(54, 62).lineTo(74, 56).lineTo(84, 64)
        .moveTo(34, 58).lineTo(20, 70)
        .detach(),
    [],
  );
  return (
    <>
      <RoundedRect x={3} y={3} width={94} height={94} r={16} color={cracked ? BOARD.crackedTint : alt ? BOARD.iceAlt : BOARD.ice} />
      {/* Hafif parıltı: sol üstte iki eğik çizgi */}
      <Group opacity={cracked ? 0.45 : 0.75}>
        <Line p1={vec(16, 30)} p2={vec(30, 16)} color={BOARD.iceShine} strokeWidth={5} strokeCap="round" />
        <Line p1={vec(18, 44)} p2={vec(24, 38)} color={BOARD.iceShine} strokeWidth={4} strokeCap="round" />
      </Group>
      {cracked && (
        <Path path={crack} color={BOARD.crack} style="stroke" strokeWidth={2.6} strokeCap="round" strokeJoin="round" />
      )}
    </>
  );
}

function Water() {
  const clock = useClock();
  const waves = useMemo(() => {
    const wave = (y: number, x0: number) =>
      Skia.PathBuilder.Make()
        .moveTo(x0, y).quadTo(x0 + 7, y - 6, x0 + 14, y).quadTo(x0 + 21, y + 6, x0 + 28, y)
        .detach();
    return [wave(36, 20), wave(62, 46)];
  }, []);
  // Dalgalar ağır ağır sağa sola salınır.
  const drift = useDerivedValue(() => [{ translateX: Math.sin(clock.value / 1400) * 6 }]);
  const driftBack = useDerivedValue(() => [{ translateX: -Math.sin(clock.value / 1400) * 6 }]);
  return (
    <>
      <RoundedRect x={3} y={3} width={94} height={94} r={16} color={BOARD.waterDeep} />
      <RoundedRect x={7} y={7} width={86} height={86} r={13} color={BOARD.water} />
      <Group transform={drift}>
        <Path path={waves[0]!} color={BOARD.waterWave} style="stroke" strokeWidth={3.4} strokeCap="round" />
      </Group>
      <Group transform={driftBack}>
        <Path path={waves[1]!} color={BOARD.waterWave} style="stroke" strokeWidth={3.4} strokeCap="round" />
      </Group>
    </>
  );
}
