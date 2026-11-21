/**
 * Yuvarlak penguen portresi: oyuncunun seçtiği penguen, kostümüyle, kafadan
 * yakın çekim. Profil butonunda soyut "kişi" ikonunun yerine kullanılır.
 */
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Penguin } from './Penguin';
import type { PenguinLook } from './types';

/** Penguenin boyu, dairenin çapının katı olarak: kafa daireyi doldurur. */
const ZOOM = 1.22;
/** Dairenin ortasına gelen nokta (penguenin boyuna oranla): kafanın biraz üstü, şapkaya yer kalsın. */
const FOCUS = { x: 0.5, y: 0.31 };

export interface PenguinAvatarProps extends Pick<PenguinLook, 'character' | 'costume'> {
  /** Dairenin çapı. */
  size: number;
}

export function PenguinAvatar({ size, character, costume }: PenguinAvatarProps) {
  const { colors } = useTheme();
  const penguin = size * ZOOM;
  return (
    <View
      pointerEvents="none"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceSunken }]}
    >
      <View style={{ position: 'absolute', left: size / 2 - penguin * FOCUS.x, top: size / 2 - penguin * FOCUS.y }}>
        <Penguin character={character} costume={costume} size={penguin} interactive={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { overflow: 'hidden' },
});
