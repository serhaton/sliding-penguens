/**
 * Kayan penguenin arkasından saçılan kar zerreleri. Her kayma için bir kez
 * kurulur, kendi kendine oynar ve biter. Bütün zerreler tek yol olarak çizilir.
 */
import { Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Vec } from '@/engine';

const LIFE_MS = 420;

export interface SnowTrailProps {
  from: Vec;
  to: Vec;
  /** Kaymanın süresi. */
  ms: number;
  cell: number;
}

export function SnowTrail({ from, to, ms, cell }: SnowTrailProps) {
  const time = useSharedValue(0);
  const total = ms + LIFE_MS;

  useEffect(() => {
    time.set(withTiming(total, { duration: total, easing: Easing.linear }));
  }, [time, total]);

  const particles = useMemo(() => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    const count = Math.min(14, Math.round(distance * 3) + 2);
    // Yola dik birim vektör: zerreler iki yana saçılır.
    const nx = dy === 0 ? 0 : 1;
    const ny = dx === 0 ? 0 : 1;
    return Array.from({ length: count }, (_, i) => {
      const f = (i + 0.5) / count;
      const side = i % 2 === 0 ? 1 : -1;
      return {
        x: (from.x + dx * f + 0.5) * cell,
        y: (from.y + dy * f + 0.62) * cell,
        born: f * ms,
        vx: nx * side * cell * (0.1 + (i % 3) * 0.05),
        vy: ny * side * cell * (0.1 + (i % 3) * 0.05) - cell * 0.06,
        r: cell * (0.035 + (i % 4) * 0.012),
      };
    });
  }, [from.x, from.y, to.x, to.y, ms, cell]);

  const path = useDerivedValue(() => {
    const builder = Skia.PathBuilder.Make();
    for (const p of particles) {
      const age = (time.value - p.born) / LIFE_MS;
      if (age <= 0 || age >= 1) continue;
      builder.addCircle(p.x + p.vx * age, p.y + p.vy * age, p.r * (1 - age));
    }
    return builder.detach();
  });

  return <Path path={path} color="#FFFFFF" opacity={0.95} />;
}
