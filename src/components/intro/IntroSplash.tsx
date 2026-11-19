/**
 * Açılış animasyonu: sistemin açılış görseli kapanınca aynı zeminde aynı logo
 * durur, altına oyunun adı harf harf, her harfte bir yıldız sesiyle gelir. Ad
 * kısa bir süre ekranda kalır, sonra perde solarak ana ekrana açılır.
 *
 * Dokununca hemen kapanır. Tanıtım görüntüsü alınırken (sessiz mod) hiç görünmez.
 */
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { wordmarkColors } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { audio } from '@/services/audio';
import { devFlags } from '@/services/devFlags';
import { fonts, s, useTheme } from '@/theme';

/** İlk harften önceki bekleme, harfler arası süre, adın ekranda kalma süresi, perdenin solması (ms). */
const START = 350;
const STEP = 200;
const HOLD = 1500;
const FADE = 350;
/** Sistemin açılış görseliyle aynı genişlik (app.json → expo-splash-screen.imageWidth). */
const LOGO = 200;
/** Harfin yerine otururken aşağıdan kat ettiği yol. Animasyonun içinde `s()` çağrılamaz: burada hesaplanır. */
const RISE = s(24);

export function IntroSplash() {
  const { t } = useTranslation();
  const { isNight } = useTheme();
  const [visible, setVisible] = useState(() => !devFlags.quiet);
  const curtain = useSharedValue(1);
  const letters = [...t('app.name')];

  useEffect(() => {
    if (!visible) return;
    audio.preload();
    // Her harfle birlikte bir yıldız sesi.
    const timers = letters.map((_, index) => setTimeout(() => audio.play('star'), START + index * STEP));
    const total = START + letters.length * STEP + HOLD;
    curtain.value = withDelay(
      total,
      withTiming(0, { duration: FADE }, (finished) => {
        if (finished) runOnJS(setVisible)(false);
      }),
    );
    return () => timers.forEach(clearTimeout);
    // Yalnızca açılışta bir kez çalışır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const curtainStyle = useAnimatedStyle(() => ({ opacity: curtain.value }));

  if (!visible) return null;
  return (
    <Animated.View
      style={[styles.root, { backgroundColor: isNight ? '#0D1830' : '#E4F1FB' }, curtainStyle]}
      accessibilityLabel={t('app.name')}
    >
      {/* Dokununca beklemeden geçilir. */}
      <Pressable style={styles.fill} onPress={() => setVisible(false)} accessibilityRole="button">
        {/* Logo ekranın tam ortasında: sistemin açılış görseliyle üst üste biner. */}
        <Image source={require('../../../assets/splash-icon.png')} style={styles.logo} />
        <View style={styles.word}>
          {letters.map((letter, index) => (
            <Letter key={index} letter={letter} index={index} />
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Tek harf: küçükten büyüyerek, hafifçe zıplayarak yerine oturur. */
function Letter({ letter, index }: { letter: string; index: number }) {
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = withDelay(START + index * STEP, withSpring(1, { damping: 9, stiffness: 180, mass: 0.7 }));
  }, [index, pop]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 3),
    transform: [{ translateY: (1 - pop.value) * RISE }, { scale: 0.3 + pop.value * 0.7 }],
  }));
  return (
    <Animated.Text
      allowFontScaling={false}
      style={[styles.letter, { color: wordmarkColors[index % wordmarkColors.length] }, style]}
    >
      {letter}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: LOGO, height: LOGO },
  // Ad logonun altında durur ama logoyu ortadan kaydırmaz.
  word: { position: 'absolute', top: '50%', marginTop: LOGO / 2 + s(20), flexDirection: 'row' },
  letter: {
    fontFamily: fonts.black,
    fontSize: s(54),
    lineHeight: s(64),
    textShadowColor: 'rgba(13, 24, 48, 0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});
