/**
 * Tek başına bir penguen: kendi tuvaliyle, arayüzde (ana ekran, profil, sonuç
 * kartı) kullanmak için. Dokununca zıplar.
 *
 *   <Penguin character="piti" direction="left" mood="happy" pose="idle" size={160} />
 */
import { Canvas } from '@shopify/react-native-skia';
import { Pressable } from 'react-native';
import { useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { haptics } from '@/services/haptics';

import { PenguinSprite } from './PenguinSprite';
import type { PenguinLook } from './types';

export interface PenguinProps extends PenguinLook {
  /** Penguenin kenar uzunluğu (pt). */
  size?: number;
  /** Dokununca zıplasın mı? */
  interactive?: boolean;
  /** Ekran okuyucu etiketi (ör. penguenin adı). */
  label?: string;
  onPress?: () => void;
}

/**
 * Zıplama, bere ponponu ve dönen yıldızlar kutunun dışına taşar. Tuval bu
 * yüzden penguenden büyüktür (üstte ve yanlarda pay); negatif kenar
 * boşluklarıyla yerleşimde yine `size` kadar yer kaplar.
 */
const PAD_TOP = 0.35;
const PAD_SIDE = 0.15;

export function Penguin({ size = 160, interactive = true, label, onPress, ...look }: PenguinProps) {
  /** 0 = yerde, 1 = zıplamanın tepe noktası. */
  const hop = useSharedValue(0);

  const canvas = (
    <Canvas
      style={{
        width: size * (1 + PAD_SIDE * 2),
        height: size * (1 + PAD_TOP),
        marginTop: -size * PAD_TOP,
        marginHorizontal: -size * PAD_SIDE,
      }}
    >
      <PenguinSprite x={size * PAD_SIDE} y={size * PAD_TOP} size={size} hop={hop} {...look} />
    </Canvas>
  );

  if (!interactive) return canvas;
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      onPress={() => {
        haptics.tap();
        hop.set(
          withSequence(
            withTiming(1, { duration: 160 }),
            withSpring(0, { damping: 9, stiffness: 260, mass: 0.7 }),
          ),
        );
        onPress?.();
      }}
    >
      {canvas}
    </Pressable>
  );
}
