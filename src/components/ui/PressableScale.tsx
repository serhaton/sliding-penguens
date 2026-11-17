/**
 * Bütün butonların temeli: basınca hafifçe küçülür, bırakınca esneyerek geri
 * gelir ve hafif bir titreşim verir. Animasyon UI iş parçacığında çalışır.
 */
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/services/haptics';
import { motion } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Basılı hâldeki ölçek. Büyük butonlarda daha az küçülme daha iyi durur. */
  pressScale?: number;
  /** Dokunuşta titreşim (varsayılan açık). */
  haptic?: boolean;
}

export function PressableScale({
  children,
  style,
  pressScale = motion.pressScale,
  haptic = true,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        scale.set(withSpring(pressScale, motion.springSnappy));
        if (haptic) haptics.tap();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.springBouncy));
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
