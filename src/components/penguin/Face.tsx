/**
 * Penguenin yüzü: krem maske, yanaklar, gözler, gaga ve ifadeye özgü ekler.
 *
 * Kendi koordinatlarında çizilir (kafa merkezi 50,37; yarıçap 30) ve kafa
 * dairesine kırpılır. Böylece yüz, bakış yönüne doğru kaydığında kafanın
 * dışına taşmaz ve "kafasını çevirmiş" görünür. Ayakta ve kayma pozları aynı
 * yüzü kullanır.
 */
import { Circle, Group, Line, Oval, Path, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import type { Motion } from './motion';
import { GlassesLayer } from './costumes';
import { INK } from './palette';
import type { Costume, Mood, Pose } from './types';

type EyeKind = 'open' | 'sparkle' | 'wide' | 'squint' | 'halfLid' | 'closedUp' | 'closedDown';

function eyeKindFor(mood: Mood, pose: Pose): EyeKind {
  if (pose === 'sleep') return 'closedDown';
  switch (mood) {
    case 'excited': return 'sparkle';
    case 'surprised': return 'wide';
    case 'oops': return 'squint';
    case 'sleepy': return 'halfLid';
    case 'proud': return 'closedUp';
    default: return 'open';
  }
}

/** İfadenin sabit gaga açıklığı (esneme gibi animasyonlar bunun üstüne biner). */
function staticMouth(mood: Mood, pose: Pose): number {
  if (pose === 'sleep') return 0;
  if (mood === 'excited') return 0.85;
  if (mood === 'surprised') return 0.6;
  if (mood === 'oops') return 0.35;
  return 0;
}

const EYE_Y = 40;
const EYES = [38.5, 61.5] as const;

export interface FaceProps {
  mood: Mood;
  pose: Pose;
  motion: SharedValue<Motion>;
  /** Yöne bağlı sabit bakış kayması. */
  lookX: number;
  lookY: number;
  costume?: Costume;
}

export function Face({ mood, pose, motion, lookX, lookY, costume }: FaceProps) {
  const eyeKind = eyeKindFor(mood, pose);
  const mouthBase = staticMouth(mood, pose);
  const blinks = eyeKind === 'open' || eyeKind === 'sparkle' || eyeKind === 'halfLid';

  const paths = useMemo(() => {
    const head = Skia.PathBuilder.Make().addCircle(50, 37, 30).detach();
    const beak = Skia.PathBuilder.Make()
      .moveTo(45.5, 46.5)
      .quadTo(50, 44.5, 54.5, 46.5)
      .quadTo(52.5, 51.5, 50, 52.5)
      .quadTo(47.5, 51.5, 45.5, 46.5)
      .close()
      .detach();
    // Kapalı gözler: yukarı kavis (^ ^, mutlu/gururlu) ve aşağı kavis (uyku).
    const arcs = (bend: number) => {
      const b = Skia.PathBuilder.Make();
      for (const cx of EYES) b.moveTo(cx - 6.5, EYE_Y + 1).quadTo(cx, EYE_Y + 1 + bend, cx + 6.5, EYE_Y + 1);
      return b.detach();
    };
    // "> <" gözler.
    const squint = Skia.PathBuilder.Make()
      .moveTo(33, 35.5).lineTo(42.5, 40).lineTo(33, 44.5)
      .moveTo(67, 35.5).lineTo(57.5, 40).lineTo(67, 44.5)
      .detach();
    // Yarı kapalı göz kapağı: gözün üstünü örter. Dış uçlar aşağı düşer;
    // düz ya da içe eğik kapak kızgın görünür, dışa düşen kapak uykulu.
    const lids = Skia.PathBuilder.Make();
    const lidEdge = Skia.PathBuilder.Make();
    for (const cx of EYES) {
      const outer = cx < 50 ? -1 : 1;
      const outerY = EYE_Y + 1.6;
      const innerY = EYE_Y - 2.2;
      lids.addPoly(
        [
          { x: cx - outer * 9.5, y: EYE_Y - 10 },
          { x: cx + outer * 9.5, y: EYE_Y - 10 },
          { x: cx + outer * 9.5, y: outerY },
          { x: cx - outer * 9.5, y: innerY },
        ],
        true,
      );
      lidEdge.moveTo(cx + outer * 7.6, outerY - 0.4).lineTo(cx - outer * 7.2, innerY + 0.3);
    }
    const brows = Skia.PathBuilder.Make()
      .moveTo(31.5, 31).lineTo(43, 27.5)
      .moveTo(68.5, 31).lineTo(57, 27.5)
      .detach();
    const drop = (x: number, y: number, s: number) =>
      Skia.PathBuilder.Make()
        .moveTo(x, y - 3 * s)
        .quadTo(x + 2.6 * s, y + 0.6 * s, x, y + 2 * s)
        .quadTo(x - 2.6 * s, y + 0.6 * s, x, y - 3 * s)
        .close()
        .detach();
    // Dört köşeli parıltı (heyecanlı gözlerde).
    const sparkle = (x: number, y: number, r: number) =>
      Skia.PathBuilder.Make()
        .moveTo(x, y - r).quadTo(x, y, x + r, y).quadTo(x, y, x, y + r)
        .quadTo(x, y, x - r, y).quadTo(x, y, x, y - r).close().detach();
    return {
      head, beak, squint, brows,
      arcUp: arcs(-8),
      arcDown: arcs(6),
      lids: lids.detach(),
      lidEdge: lidEdge.detach(),
      tear: drop(31, 51, 1),
      sweat: drop(76, 27, 1.2),
      sparkles: [sparkle(42.5, 43.5, 2.6), sparkle(65.5, 43.5, 2.6)],
    };
  }, []);

  const lookTransform = useDerivedValue(() => [
    { translateX: lookX + motion.value.lookX },
    { translateY: lookY + motion.value.lookY },
  ]);
  const eyeTransform = useDerivedValue(() => [{ scaleY: blinks ? motion.value.eyeOpen : 1 }]);
  const mouthTransform = useDerivedValue(() => [
    { scaleY: Math.max(mouthBase, motion.value.mouth) },
  ]);
  const cheekOpacity = useDerivedValue(() => Math.min(1, 0.75 * motion.value.blush));

  const eyeR = eyeKind === 'sparkle' ? 8.3 : 7.6;

  return (
    <Group clip={paths.head}>
      <Group transform={lookTransform}>
        {/* Maske: iki daire + alt oval, üstte kalp biçimi bir tepe bırakır */}
        <Circle cx={39.5} cy={39} r={14} color={INK.cream} />
        <Circle cx={60.5} cy={39} r={14} color={INK.cream} />
        <Oval x={28} y={36} width={44} height={24} color={INK.cream} />

        {/* Pembe yanaklar */}
        <Group opacity={cheekOpacity}>
          <Oval x={24.5} y={46} width={11} height={7} color={INK.cheek} />
          <Oval x={64.5} y={46} width={11} height={7} color={INK.cheek} />
        </Group>

        {/* Gözler */}
        {(eyeKind === 'open' || eyeKind === 'sparkle' || eyeKind === 'halfLid') && (
          <Group transform={eyeTransform} origin={vec(50, EYE_Y)}>
            {EYES.map((cx) => (
              <Group key={cx}>
                <Circle cx={cx} cy={EYE_Y} r={eyeR} color={INK.eye} />
                {/* Her gözde iki parıltı; üzgünken alttaki büyür (dolu dolu göz). */}
                <Circle cx={cx - 2.5} cy={EYE_Y - 2.8} r={eyeKind === 'sparkle' ? 3.2 : 2.8} color={INK.white} />
                <Circle cx={cx + 2.5} cy={EYE_Y + 2.8} r={mood === 'sad' ? 2.2 : 1.3} color={INK.white} />
              </Group>
            ))}
            {eyeKind === 'sparkle' &&
              paths.sparkles.map((p, i) => <Path key={i} path={p} color={INK.white} />)}
            {eyeKind === 'halfLid' && (
              <>
                <Path path={paths.lids} color={INK.cream} />
                <Path path={paths.lidEdge} color={INK.eye} style="stroke" strokeWidth={1.8} strokeCap="round" />
              </>
            )}
          </Group>
        )}
        {eyeKind === 'wide' &&
          EYES.map((cx) => (
            <Group key={cx}>
              <Circle cx={cx} cy={EYE_Y} r={8.2} color={INK.white} />
              <Circle cx={cx} cy={EYE_Y} r={8.2} color={INK.eye} style="stroke" strokeWidth={1.8} />
              <Circle cx={cx} cy={EYE_Y} r={3.2} color={INK.eye} />
              <Circle cx={cx - 1} cy={EYE_Y - 1.2} r={1} color={INK.white} />
            </Group>
          ))}
        {eyeKind === 'squint' && (
          <Path path={paths.squint} color={INK.eye} style="stroke" strokeWidth={2.8} strokeCap="round" strokeJoin="round" />
        )}
        {(eyeKind === 'closedUp' || eyeKind === 'closedDown') && (
          <Path
            path={eyeKind === 'closedUp' ? paths.arcUp : paths.arcDown}
            color={INK.eye}
            style="stroke"
            strokeWidth={2.6}
            strokeCap="round"
          />
        )}

        {mood === 'sad' && pose !== 'sleep' && (
          <>
            <Path path={paths.brows} color={INK.featherDark} style="stroke" strokeWidth={2.2} strokeCap="round" />
            <Path path={paths.tear} color={INK.tear} />
          </>
        )}

        {/* Gaga: açık ağız üst gaganın altında büyür */}
        <Group transform={mouthTransform} origin={vec(50, 49.5)}>
          <Oval x={46} y={48.5} width={8} height={8.5} color={INK.mouth} />
        </Group>
        <Path path={paths.beak} color={INK.beak} />
        <Line p1={vec(47.2, 48.6)} p2={vec(52.8, 48.6)} color={INK.beakDark} strokeWidth={0.8} strokeCap="round" />

        <GlassesLayer glasses={costume?.glasses} />
      </Group>
      {mood === 'oops' && pose !== 'sleep' && <Path path={paths.sweat} color={INK.tear} />}
    </Group>
  );
}
