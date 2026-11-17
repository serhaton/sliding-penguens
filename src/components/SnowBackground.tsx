/**
 * Bütün ekranların zemini: yumuşak gökyüzü geçişi, kutup ışığı, iki kar tepesi
 * ve yavaş düşen kar. Tamamı Skia ile çizilir; görsel dosyası yok.
 *
 * Kar taneleri tek bir yol (path) olarak her karede UI iş parçacığında yeniden
 * kurulur: React yeniden çizimi olmaz, 60 fps'i yormaz.
 */
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Skia,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { useTheme } from '@/theme';

interface Flake {
  /** Yatay konum (0–1). */
  x: number;
  /** Başlangıç dikey konumu (0–1). */
  phase: number;
  /** Ekranı baştan sona geçme süresi (ms). */
  period: number;
  radius: number;
  /** Sağa sola salınım genliği (pt). */
  sway: number;
}

/** Tohumlu küçük rastgele üreteç: kar her açılışta aynı düzende, titreme yok. */
function makeFlakes(count: number, seed: number): Flake[] {
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: next(),
    phase: next(),
    period: 14000 + next() * 16000,
    radius: 2 + next() * 3,
    sway: 6 + next() * 14,
  }));
}

export function SnowBackground({ flakeCount = 36 }: { flakeCount?: number }) {
  const { colors, isNight } = useTheme();
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const flakes = useMemo(() => makeFlakes(flakeCount, 7), [flakeCount]);

  // Tepeler sabit; yalnızca ekran boyutu değişince yeniden kurulur.
  const { farHill, nearHill } = useMemo(() => {
    const far = Skia.PathBuilder.Make()
      .moveTo(0, height * 0.78)
      .quadTo(width * 0.3, height * 0.66, width * 0.62, height * 0.76)
      .quadTo(width * 0.85, height * 0.83, width, height * 0.74)
      .lineTo(width, height)
      .lineTo(0, height)
      .close()
      .detach();
    const near = Skia.PathBuilder.Make()
      .moveTo(0, height * 0.9)
      .quadTo(width * 0.25, height * 0.82, width * 0.55, height * 0.89)
      .quadTo(width * 0.8, height * 0.95, width, height * 0.86)
      .lineTo(width, height)
      .lineTo(0, height)
      .close()
      .detach();
    return { farHill: far, nearHill: near };
  }, [width, height]);

  const snow = useDerivedValue(() => {
    const t = clock.value;
    const builder = Skia.PathBuilder.Make();
    for (const f of flakes) {
      const progress = (t / f.period + f.phase) % 1;
      const y = progress * (height + 20) - 10;
      const x = f.x * width + Math.sin(progress * Math.PI * 4 + f.phase * 10) * f.sway;
      builder.addCircle(x, y, f.radius);
    }
    return builder.detach();
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[colors.bgTop, colors.bgBottom]}
        />
      </Rect>

      {/* Kutup ışığı: üstte çok hafif iki renk lekesi. */}
      <Group opacity={isNight ? 0.35 : 0.3}>
        <Circle cx={width * 0.15} cy={height * 0.1} r={width * 0.6}>
          <RadialGradient
            c={vec(width * 0.15, height * 0.1)}
            r={width * 0.6}
            colors={[colors.auroraGreen, `${colors.auroraGreen}00`]}
          />
        </Circle>
        <Circle cx={width * 0.9} cy={height * 0.22} r={width * 0.55}>
          <RadialGradient
            c={vec(width * 0.9, height * 0.22)}
            r={width * 0.55}
            colors={[colors.auroraPurple, `${colors.auroraPurple}00`]}
          />
        </Circle>
      </Group>

      <Path path={farHill} color={colors.hillFar} />
      <Path path={nearHill} color={colors.hillNear} />
      {/* Önce ince mavi kenar, üstüne beyaz dolgu: gündüz zemininde de seçilir. */}
      <Path path={snow} color={colors.snowEdge} style="stroke" strokeWidth={1} />
      <Path path={snow} color={colors.snow} opacity={isNight ? 0.7 : 1} />
    </Canvas>
  );
}
