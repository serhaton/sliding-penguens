/**
 * Tahtadaki bir penguen: konumu, kayması, çarpma ezilmesi, "hayır" sallanması,
 * igloya girerken küçülmesi ve ipucu parıltısı. Tahta tuvalinin içinde çizilir.
 *
 * Ne göstereceğini `PenguinView` söyler; bu bileşen yalnızca o görünüme doğru
 * canlandırır. Zamanlamayı (hangi olay ne zaman) Board yönetir.
 */
import { Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { PenguinSprite, type Mood, type Pose } from '@/components/penguin';
import type { CharacterId } from '@/data/characters';
import { DIR_VECTORS, type Direction, type PenguinColor } from '@/engine';
import { penguinColors } from '@/theme/colors';

export interface PenguinView {
  /** Hedef hücre (kesirli olabilir). */
  x: number;
  y: number;
  /** Bu hedefe kaç ms'de gidilecek; 0 = anında. */
  moveMs: number;
  /** Görünen yön. "Çarpınca dön" kuralında çarpma anında değişir. */
  dir: Direction;
  pose: Pose;
  mood: Mood;
  /** Igloya girdi: küçülerek kaybolur. */
  gone: boolean;
  /** Her artışta bir kez çarpma ezilmesi oynar. */
  squashTick: number;
  /** Her artışta bir kez "hayır" sallanması oynar. */
  nopeTick: number;
}

export interface BoardPenguinProps {
  view: PenguinView;
  cell: number;
  character?: CharacterId;
  color: PenguinColor;
  largeSymbol: boolean;
  /** İpucu: parlar ve yön oku yanıp söner. */
  hinted: boolean;
  /**
   * Yüz yüze düello: penguenin çizimi hücresinin ortası çevresinde bu kadar
   * (radyan) döner. Yön oku dönmez: ok her zaman gerçek kayma yönünü gösterir.
   */
  spin?: SharedValue<number>;
  /** Çizim şu an ters duruyor (bakış yönü buna göre düzeltilir). */
  turned?: boolean;
}

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Buzda kayma: çabuk hızlanır, sabit gider, engelde aniden durur. */
const SLIDE_EASING = Easing.bezier(0.35, 0, 0.85, 0.9);

export function BoardPenguin({ view, cell, character, color, largeSymbol, hinted, spin, turned = false }: BoardPenguinProps) {
  const direction = view.dir;
  const px = useSharedValue(view.x);
  const py = useSharedValue(view.y);
  const presence = useSharedValue(view.gone ? 0 : 1);
  const squash = useSharedValue(0);
  const shake = useSharedValue(0);
  const pulse = useSharedValue(0);
  /** Yön değişince ok kısa bir an büyür: dönüş gözden kaçmasın. */
  const arrowPop = useSharedValue(0);

  useEffect(() => {
    if (view.moveMs > 0) {
      px.set(withTiming(view.x, { duration: view.moveMs, easing: SLIDE_EASING }));
      py.set(withTiming(view.y, { duration: view.moveMs, easing: SLIDE_EASING }));
    } else {
      px.set(view.x);
      py.set(view.y);
    }
  }, [view.x, view.y, view.moveMs, px, py]);

  useEffect(() => {
    // Igloya girerken küçülerek kaybolur; yeni dalgada esneyerek belirir.
    presence.set(
      view.gone ? withTiming(0, { duration: 240 }) : withSpring(1, { damping: 12, stiffness: 190, mass: 0.7 }),
    );
  }, [view.gone, presence]);

  useEffect(() => {
    if (view.squashTick === 0) return;
    squash.set(withSequence(withTiming(1, { duration: 70 }), withSpring(0, { damping: 7, stiffness: 300, mass: 0.6 })));
  }, [view.squashTick, squash]);

  useEffect(() => {
    if (view.nopeTick === 0) return;
    shake.set(
      withSequence(
        withTiming(-1, { duration: 50 }),
        withTiming(1, { duration: 90 }),
        withTiming(-0.6, { duration: 80 }),
        withTiming(0, { duration: 70 }),
      ),
    );
  }, [view.nopeTick, shake]);

  const firstDir = useRef(direction);
  useEffect(() => {
    if (firstDir.current === direction) return;
    firstDir.current = direction;
    arrowPop.set(withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 9, stiffness: 240 })));
  }, [direction, arrowPop]);

  useEffect(() => {
    pulse.set(hinted ? withRepeat(withTiming(1, { duration: 650 }), -1, true) : 0);
  }, [hinted, pulse]);

  const dir = DIR_VECTORS[direction];
  const horizontal = dir.x !== 0;

  const transform = useDerivedValue(() => {
    const s = squash.value;
    // Çarpma yönünde ezilir, dik yönde şişer.
    const along = 1 - s * 0.2;
    const across = 1 + s * 0.16;
    return [
      { translateX: px.value * cell + shake.value * cell * 0.09 },
      { translateY: py.value * cell },
      { translateX: cell / 2 },
      { translateY: cell * 0.9 },
      { scale: presence.value },
      { scaleX: horizontal ? along : across },
      { scaleY: horizontal ? across : along },
      { translateX: -cell / 2 },
      { translateY: -cell * 0.9 },
    ];
  });
  const opacity = useDerivedValue(() => Math.min(1, presence.value * 1.5));
  const spriteSpin = useDerivedValue(() => [{ rotate: spin ? spin.value : 0 }]);
  const glowOpacity = useDerivedValue(() => 0.25 + pulse.value * 0.45);
  const glowRadius = useDerivedValue(() => cell * (0.5 + pulse.value * 0.08));
  const arrowOpacity = useDerivedValue(() => (hinted ? 0.4 + pulse.value * 0.6 : 0.9));
  const arrowTransform = useDerivedValue(() => [{ scale: 1 + arrowPop.value * 0.9 }]);
  const arrowOrigin = { x: cell / 2 + dir.x * cell * 0.48, y: cell / 2 + dir.y * cell * 0.48 };

  // Yön oku: penguenin baktığı kenarda küçük bir üçgen.
  const arrow = useMemo(() => {
    const c = cell / 2;
    const tip = { x: c + dir.x * cell * 0.56, y: c + dir.y * cell * 0.56 };
    const base = { x: c + dir.x * cell * 0.4, y: c + dir.y * cell * 0.4 };
    const half = cell * 0.13;
    return Skia.PathBuilder.Make()
      .moveTo(tip.x, tip.y)
      .lineTo(base.x - dir.y * half, base.y + dir.x * half)
      .lineTo(base.x + dir.y * half, base.y - dir.x * half)
      .close()
      .detach();
  }, [cell, dir.x, dir.y]);

  const tone = penguinColors[color];
  const showArrow = view.pose !== 'slide' && view.pose !== 'sleep' && !view.gone;
  const inset = cell * 0.04;

  return (
    <Group transform={transform} opacity={opacity}>
      {hinted && <Circle cx={cell / 2} cy={cell / 2} r={glowRadius} color="#FFD45E" opacity={glowOpacity} />}
      <Group transform={spriteSpin} origin={{ x: cell / 2, y: cell / 2 }}>
        <PenguinSprite
          x={inset}
          y={inset}
          size={cell - inset * 2}
          character={character}
          color={color}
          // Ters çizilirken bakış yönü de ters verilir: ekranda yine doğru yöne bakar.
          direction={turned ? OPPOSITE[direction] : direction}
          pose={view.pose}
          mood={view.mood}
          largeSymbol={largeSymbol}
        />
      </Group>
      {/* Yön oku penguenin üstünde çizilir: aşağı/yukarı bakarken de görünsün */}
      {showArrow && (
        <Group transform={arrowTransform} origin={arrowOrigin}>
          <Path path={arrow} color="#FFFFFF" style="stroke" strokeWidth={cell * 0.06} strokeJoin="round" opacity={arrowOpacity} />
          <Path path={arrow} color={hinted ? '#FFB800' : tone.main} opacity={arrowOpacity} />
        </Group>
      )}
    </Group>
  );
}
