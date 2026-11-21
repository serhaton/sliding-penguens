/**
 * Şans çarkının çizimi: renkli dilimler, yanıp sönen ampullü çerçeve, ortada
 * göbek ve üstte ibre. Yalnızca çizer; ne çıkacağına ve ne kadar döneceğine
 * ekran karar verir ve `rotation` değerini oynatır (bkz. app/daily/wheel.tsx).
 *
 * Çizim 200 birimlik tasarım alanında yapılır. `rotation` 0 iken 0. dilim tam
 * ibrenin altındadır; i. dilimi ibreye getirmek için çark -i × dilim açısı
 * kadar döner. Yazılar dilim ibredeyken düz okunacak şekilde durur.
 */
import { Canvas, Circle, Group, Line, Path, Rect, RoundedRect, Skia, Text, useClock, useFont, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { WHEEL_SEGMENTS } from '@/game/wheel';
import { penguinColors } from '@/theme/colors';

/** Tasarım alanı: çark 200 birim; üstte ibre için pay. */
const W = 200;
const TOP = 14;
const H = W + TOP;
const CX = W / 2;
const CY = TOP + W / 2;
/** Dilimlerin yarıçapı ve çerçevenin dış yarıçapı. */
const R = 88;
const RIM = 99;
const BULBS = 16;

export const WHEEL_SEGMENT_COUNT = WHEEL_SEGMENTS.length;
/** Bir dilimin açısı (radyan). */
export const WHEEL_SEGMENT_ANGLE = (Math.PI * 2) / WHEEL_SEGMENT_COUNT;

/** Dilim renkleri, çarktaki sırayla: komşular birbirinden iyice ayrışır. */
const COLORS = ['#3DA5FF', '#FF9A3D', '#3DCB7E', '#FFC21A', '#FF5C7A', '#7A5CFF', '#19C3B1', '#D65CFF'];
const INK = '#1B2A4A';
const RIM_COLOR = '#2A3F9E';
const RIM_DARK = '#1B2A6B';

export interface LuckyWheelProps {
  /** Çarkın ekrandaki genişliği (pt). */
  size: number;
  /** Çarkın dönüşü (radyan, saat yönü artı). */
  rotation: SharedValue<number>;
}

export function LuckyWheel({ size, rotation }: LuckyWheelProps) {
  const clock = useClock();
  const font = useFont(require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'), 17);
  const bigFont = useFont(require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'), 21);

  const paths = useMemo(() => {
    const sweep = 360 / WHEEL_SEGMENT_COUNT;
    // 0. dilim: tepede ortalanmış pasta dilimi.
    const wedge = Skia.PathBuilder.Make()
      .moveTo(CX, CY)
      .arcToOval({ x: CX - R, y: CY - R, width: R * 2, height: R * 2 }, -90 - sweep / 2, sweep, false)
      .close()
      .detach();
    // İbre: aşağı bakan damla.
    const pointer = Skia.PathBuilder.Make()
      .moveTo(CX, TOP + 20)
      .lineTo(CX - 11, TOP - 4)
      .quadTo(CX, TOP - 13, CX + 11, TOP - 4)
      .close()
      .detach();
    // Büyük ödülün yıldızı.
    const star = Skia.PathBuilder.Make();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 7 : 3.1;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = CX + r * Math.cos(a);
      const y = CY - R * 0.46 + r * Math.sin(a);
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    return { wedge, pointer, star: star.close().detach() };
  }, []);

  const spin = useDerivedValue(() => [{ rotate: rotation.value }]);
  // Ampuller sırayla yanıp söner (tekler ve çiftler dönüşümlü).
  const evenGlow = useDerivedValue(() => (Math.floor(clock.value / 420) % 2 === 0 ? 1 : 0.35));
  const oddGlow = useDerivedValue(() => (Math.floor(clock.value / 420) % 2 === 0 ? 0.35 : 1));

  const scale = size / W;
  const best = Math.max(...WHEEL_SEGMENTS.map((segment) => segment.coins));

  return (
    <Canvas style={{ width: size, height: H * scale }}>
      <Group transform={[{ scale }]}>
        {/* Çerçeve */}
        <Circle cx={CX} cy={CY + 3} r={RIM} color={INK} opacity={0.16} />
        <Circle cx={CX} cy={CY} r={RIM} color={RIM_DARK} />
        <Circle cx={CX} cy={CY} r={RIM - 2.5} color={RIM_COLOR} />

        {/* Dönen kısım: dilimler ve yazıları */}
        <Group transform={spin} origin={vec(CX, CY)}>
          {WHEEL_SEGMENTS.map((segment, i) => {
            const label = String(segment.coins);
            const labelFont = segment.coins === best ? bigFont : font;
            const width = labelFont ? labelFont.measureText(label).width : 0;
            return (
              <Group key={segment.id} transform={[{ rotate: i * WHEEL_SEGMENT_ANGLE }]} origin={vec(CX, CY)}>
                <Path path={paths.wedge} color={COLORS[i % COLORS.length]!} />
                {/* Dilimin iç kenarına doğru hafif koyulaşma: derinlik hissi. */}
                <Path path={paths.wedge} color={INK} opacity={i % 2 === 0 ? 0 : 0.06} />
                {segment.id === 'item' ? (
                  <Gift />
                ) : (
                  <>
                    {labelFont && (
                      <>
                        <Text x={CX - width / 2} y={CY - R * 0.67} text={label} font={labelFont} color={INK} opacity={0.3} style="stroke" strokeWidth={3} strokeJoin="round" />
                        <Text x={CX - width / 2} y={CY - R * 0.67} text={label} font={labelFont} color="#FFFFFF" />
                      </>
                    )}
                    {segment.coins === best ? (
                      <Path path={paths.star} color="#FFFFFF" />
                    ) : (
                      <>
                        <Circle cx={CX} cy={CY - R * 0.46} r={6.4} color={penguinColors.yellow.dark} />
                        <Circle cx={CX} cy={CY - R * 0.46} r={4.6} color="#FFD23C" />
                      </>
                    )}
                  </>
                )}
              </Group>
            );
          })}
          {/* Dilim ayraçları */}
          {WHEEL_SEGMENTS.map((segment, i) => {
            const a = -Math.PI / 2 + (i + 0.5) * WHEEL_SEGMENT_ANGLE;
            return (
              <Line
                key={segment.id}
                p1={vec(CX, CY)}
                p2={vec(CX + R * Math.cos(a), CY + R * Math.sin(a))}
                color="#FFFFFF"
                opacity={0.75}
                strokeWidth={1.6}
              />
            );
          })}
        </Group>

        {/* Dilimlerin çevresinde ince beyaz halka */}
        <Circle cx={CX} cy={CY} r={R} color="#FFFFFF" style="stroke" strokeWidth={2} />

        {/* Ampuller: çerçevede sabit durur */}
        {[0, 1].map((parity) => (
          <Group key={parity} opacity={parity === 0 ? evenGlow : oddGlow}>
            {Array.from({ length: BULBS / 2 }, (_, k) => {
              const a = ((k * 2 + parity) / BULBS) * Math.PI * 2 + Math.PI / BULBS;
              return <Circle key={k} cx={CX + (RIM - 5.6) * Math.cos(a)} cy={CY + (RIM - 5.6) * Math.sin(a)} r={2.7} color="#FFF3B0" />;
            })}
          </Group>
        ))}

        {/* Göbek */}
        <Circle cx={CX} cy={CY + 1.5} r={18} color={INK} opacity={0.2} />
        <Circle cx={CX} cy={CY} r={18} color="#FFFFFF" />
        <Circle cx={CX} cy={CY} r={13.5} color="#FFC93C" />
        <Circle cx={CX - 3.5} cy={CY - 4} r={4} color="#FFF1B8" />

        {/* İbre */}
        <Path path={paths.pointer} color={INK} opacity={0.2} transform={[{ translateY: 2 }]} />
        <Path path={paths.pointer} color="#FF4D6A" />
        <Path path={paths.pointer} color="#FFFFFF" style="stroke" strokeWidth={2.4} strokeJoin="round" />
        <Circle cx={CX} cy={TOP - 3} r={3} color="#FFFFFF" />
      </Group>
    </Canvas>
  );
}

/** Sürpriz kostüm dilimi: kurdeleli hediye kutusu. */
function Gift() {
  const y = CY - R * 0.72;
  return (
    <>
      <RoundedRect x={CX - 11} y={y + 7} width={22} height={17} r={3} color="#FFF3D6" />
      <RoundedRect x={CX - 13} y={y + 2} width={26} height={7} r={2.5} color="#FFFFFF" />
      <Rect x={CX - 2.2} y={y + 2} width={4.4} height={22} color="#FF4D6A" />
      <Circle cx={CX - 4.6} cy={y - 0.5} r={3.6} color="#FF4D6A" />
      <Circle cx={CX + 4.6} cy={y - 0.5} r={3.6} color="#FF4D6A" />
      <Circle cx={CX} cy={y + 1} r={2.2} color="#D93655" />
    </>
  );
}
