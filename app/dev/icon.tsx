/**
 * Uygulama ikonu sahnesi (geliştirici aracı): ikon ve açılış görseli buradan
 * ekran görüntüsüyle üretilir (scripts/make-store-assets.py). Penguen
 * dondurulmuş bir saatle çizilir: her çekimde aynı poz.
 *
 *   pengolo://dev/icon
 *
 * Kare, ekranın sol kenarından başlar ve SIZE pt genişliğindedir.
 */
import { Canvas, Circle, Group, LinearGradient, Oval, Rect, Text, useFont, vec } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { PenguinSprite } from '@/components/penguin';
import { wordmarkColors } from '@/components/ui';

/** Karenin kenarı (pt) ve ekranın üstünden uzaklığı (durum çubuğunun altında). */
export const ICON_SIZE = 342;
export const ICON_TOP = 120;

/** Penguenin çevresinde yay çizen ad. */
const NAME = 'Pengolo';

export default function IconScene() {
  // Dondurulmuş saat: göz kırpma ve nefes animasyonu çekimi bozmasın.
  const clock = useSharedValue(1300);
  const s = ICON_SIZE;
   
  const font = useFont(require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'), s * 0.17);

  // Yay: merkezi penguenin gövdesinde, harfler başının üstünden dolanır.
  const cx = s * 0.5;
  const cy = s * 0.6;
  const radius = s * 0.38;
  const gap = s * 0.004;
  const letters = [...NAME];
  const widths = font ? font.getGlyphWidths(font.getGlyphIDs(NAME)) : [];
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (letters.length - 1);
  let cursor = -total / 2;
  const glyphs = letters.map((letter, index) => {
    const width = widths[index] ?? 0;
    // Harfin ortasının yay üzerindeki açısı (0 = tepe, saat yönünde artar).
    const angle = (cursor + width / 2) / radius;
    cursor += width + gap;
    return { letter, width, angle, color: wordmarkColors[index % wordmarkColors.length] };
  });

  return (
    <View style={styles.root}>
      <Canvas style={{ position: 'absolute', left: 0, top: ICON_TOP, width: s, height: s }}>
        {/* Gökyüzü */}
        <Rect x={0} y={0} width={s} height={s}>
          <LinearGradient start={vec(0, 0)} end={vec(s, s)} colors={['#8FE3F5', '#4FA8FF', '#5B7BFF']} />
        </Rect>
        {/* Yumuşak ışık halkası */}
        <Circle cx={cx} cy={cy} r={s * 0.36} color="#FFFFFF" opacity={0.16} />
        <Circle cx={cx} cy={cy} r={s * 0.26} color="#FFFFFF" opacity={0.14} />
        {/* Kar tepeleri */}
        <Oval x={-s * 0.35} y={s * 0.78} width={s * 1.1} height={s * 0.6} color="#D6ECFB" />
        <Oval x={s * 0.2} y={s * 0.84} width={s * 1.2} height={s * 0.6} color="#FFFFFF" />
        {/* Penguen */}
        <PenguinSprite x={s * 0.2} y={s * 0.36} size={s * 0.6} character="piti" mood="happy" clock={clock} showSymbol={false} />
        {/* Ad: her harf kendi renginde, beyaz çerçeveyle; yay boyunca döndürülür. */}
        {font &&
          glyphs.map(({ letter, width, angle, color }, index) => (
            <Group
              key={index}
              transform={[
                { translateX: cx + radius * Math.sin(angle) },
                { translateY: cy - radius * Math.cos(angle) },
                { rotate: angle },
              ]}
            >
              <Text x={-width / 2} y={0} text={letter} font={font} color="#FFFFFF" style="stroke" strokeWidth={s * 0.045} strokeJoin="round" />
              <Text x={-width / 2} y={0} text={letter} font={font} color={color} />
            </Group>
          ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#000000' } });
