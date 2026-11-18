/**
 * Uygulama ikonu sahnesi (geliştirici aracı): ikon ve açılış görseli buradan
 * ekran görüntüsüyle üretilir (scripts/make-store-assets.py). Penguen
 * dondurulmuş bir saatle çizilir: her çekimde aynı poz.
 *
 *   slidingpenguins://dev/icon
 *
 * Kare, ekranın sol kenarından başlar ve SIZE pt genişliğindedir.
 */
import { Canvas, Circle, LinearGradient, Oval, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { PenguinSprite } from '@/components/penguin';

/** Karenin kenarı (pt) ve ekranın üstünden uzaklığı (durum çubuğunun altında). */
export const ICON_SIZE = 342;
export const ICON_TOP = 120;

export default function IconScene() {
  // Dondurulmuş saat: göz kırpma ve nefes animasyonu çekimi bozmasın.
  const clock = useSharedValue(1300);
  const s = ICON_SIZE;
  return (
    <View style={styles.root}>
      <Canvas style={{ position: 'absolute', left: 0, top: ICON_TOP, width: s, height: s }}>
        {/* Gökyüzü */}
        <Rect x={0} y={0} width={s} height={s}>
          <LinearGradient start={vec(0, 0)} end={vec(s, s)} colors={['#8FE3F5', '#4FA8FF', '#5B7BFF']} />
        </Rect>
        {/* Yumuşak ışık halkası */}
        <Circle cx={s * 0.5} cy={s * 0.44} r={s * 0.4} color="#FFFFFF" opacity={0.16} />
        <Circle cx={s * 0.5} cy={s * 0.44} r={s * 0.29} color="#FFFFFF" opacity={0.14} />
        {/* Kar tepeleri */}
        <Oval x={-s * 0.35} y={s * 0.74} width={s * 1.1} height={s * 0.6} color="#D6ECFB" />
        <Oval x={s * 0.2} y={s * 0.8} width={s * 1.2} height={s * 0.6} color="#FFFFFF" />
        {/* Penguen */}
        <PenguinSprite x={s * 0.14} y={s * 0.2} size={s * 0.72} character="piti" mood="happy" clock={clock} showSymbol={false} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#000000' } });
