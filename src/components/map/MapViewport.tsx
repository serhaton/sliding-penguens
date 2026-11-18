/**
 * Haritanın penceresi: içeriği kaydırır ve yakınlaştırır.
 *
 *  - Açılış: içerik önce uzaktan, tamamı görünecek şekilde gelir; kısa bir süre
 *    sonra `focus` noktasına (oyuncunun kaldığı bölüm) yumuşakça yakınlaşır.
 *  - Sonra oyuncu serbesttir: kaydırır, iki parmakla yakınlaştırıp uzaklaştırır.
 *    Köşedeki iki düğme hareket bilmeyi gerektirmez: biri kıtanın tamamını
 *    gösterir, diğeri yeniden `focus` noktasına döner.
 *
 * Kamera (öteleme + ölçek) UI iş parçacığındaki paylaşılan değerlerde durur;
 * hareket sırasında React yeniden çizimi olmaz. Sınır hesabı saf fonksiyonlarda
 * (layout.ts).
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { IconButton } from '@/components/ui';
import { radii, spacing, ui, useTheme } from '@/theme';

import { clampAxis, fitScale, focusCamera, overviewCamera, type MapPoint } from './layout';

/** Uzak görünümde bekleme ve yakınlaşma süreleri (ms). */
const INTRO_HOLD_MS = 2000;
const ZOOM_MS = 900;
const ZOOM_EASING = Easing.inOut(Easing.cubic);
/**
 * Kalınan yere odaklanınca varılan ölçek. Tam yakın (1) değil: çevredeki birkaç
 * satır da görünsün. Oyuncu isterse iki parmakla daha da yakınlaşır.
 */
const FOCUS_SCALE = 0.62 * ui;
/** En yakın ölçek: iPad'de düğümler telefondaki kadar iri görünsün diye cihaz katsayısı kadar. */
const MAX_SCALE = ui;

/** Haritanın o anki ölçeği; içerideki bileşenler buna göre kendini ayarlar. */
const ZoomContext = createContext<SharedValue<number> | null>(null);

/** Kameranın Skia dönüşümü: içerik koordinatlarını pencereye taşır. */
export type MapCameraTransform = SharedValue<({ translateX: number } | { translateY: number } | { scale: number })[]>;

export interface MapViewportProps {
  /** Kare içeriğin kenarı (pt). */
  contentSize: number;
  /** İçeriğin kenarındaki pay (okyanus): uzak görünüm bunu değil ortadaki kıtayı sığdırır. */
  inset?: number;
  /** Odaklanılacak nokta (içerik koordinatlarında). */
  focus: MapPoint;
  /** "Kaldığım yere dön" düğmesinin ekran okuyucu etiketi. */
  focusLabel: string;
  /** "Tüm kıtayı göster" düğmesinin ekran okuyucu etiketi. */
  overviewLabel: string;
  /** Yalnızca geliştirme: açılışta yakınlaşma; uzak görünümde kal. */
  stayFar?: boolean;
  /**
   * İçeriğin arkasındaki Skia çizimi (kıta). Pencereyi dolduran, ölçeklenmeyen
   * bir tuval döndürmeli, verilen kamera dönüşümünü kendi içinde uygulamalı ve
   * pencerenin yuvarlak köşelerine göre kendini kırpmalı (`size`: pencere boyu).
   */
  backdrop?: (camera: MapCameraTransform, size: { width: number; height: number }) => ReactNode;
  /**
   * `focus` noktasının üstünde duran işaret (bekleyen penguen). Harita küçülse
   * de ekranda aynı boyda kalır; `pinSize` kenarı, `pinLift` odak noktasının
   * ne kadar üstünde duracağıdır (içerik ölçüsünde).
   */
  pin?: ReactNode;
  pinSize?: number;
  pinLift?: number;
  children: ReactNode;
}

export function MapViewport({ contentSize, inset = 0, focus, focusLabel, overviewLabel, stayFar = false, backdrop, pin, pinSize = 0, pinLift = 0, children }: MapViewportProps) {
  const { colors } = useTheme();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  /** Pencere boyutu ve en küçük ölçek: hareket hesapları UI iş parçacığında okur. */
  const view = useSharedValue({ width: 0, height: 0, minScale: 1 });
  /** Oyuncu haritaya dokundu: açılış yakınlaşması artık araya girmez. */
  const touched = useSharedValue(false);

  const ready = viewport.width > 0;

  const flyToFocus = useCallback(() => {
    const camera = focusCamera(focus, contentSize, viewport, FOCUS_SCALE);
    const timing = { duration: ZOOM_MS, easing: ZOOM_EASING };
    x.set(withTiming(camera.x, timing));
    y.set(withTiming(camera.y, timing));
    scale.set(withTiming(camera.scale, timing));
  }, [focus, contentSize, viewport, x, y, scale]);

  const flyToOverview = useCallback(() => {
    const camera = overviewCamera(contentSize, viewport, inset);
    const timing = { duration: ZOOM_MS, easing: ZOOM_EASING };
    touched.set(true);
    x.set(withTiming(camera.x, timing));
    y.set(withTiming(camera.y, timing));
    scale.set(withTiming(camera.scale, timing));
  }, [contentSize, inset, viewport, x, y, scale, touched]);

  // Açılış: uzak görünüm, sonra kalınan yere yakınlaş.
  useEffect(() => {
    if (!ready) return;
    const far = overviewCamera(contentSize, viewport, inset);
    x.set(far.x);
    y.set(far.y);
    scale.set(far.scale);
    view.set({ ...viewport, minScale: fitScale(contentSize, viewport, inset) });
    if (stayFar) return;
    const timer = setTimeout(() => {
      if (!touched.get()) flyToFocus();
    }, INTRO_HOLD_MS);
    return () => clearTimeout(timer);
    // Yalnızca pencere ölçülünce (ve boyutu değişince) çalışır; ilerleme
    // değişince harita baştan uzaklaşmasın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, viewport.width, viewport.height]);

  // Kaydırma iki parmakla da sürer: yakınlaştırırken harita parmakları izler.
  const pan = usePanGesture({
    onBegin: () => {
      'worklet';
      touched.set(true);
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(scale);
    },
    onUpdate: (e) => {
      'worklet';
      const v = view.get();
      const size = contentSize * scale.get();
      x.set(clampAxis(x.get() + e.changeX, size, v.width));
      y.set(clampAxis(y.get() + e.changeY, size, v.height));
    },
    // Bırakınca hızıyla kayıp yavaşlar.
    onDeactivate: (e) => {
      'worklet';
      const v = view.get();
      const size = contentSize * scale.get();
      if (size > v.width) x.set(withDecay({ velocity: e.velocityX, clamp: [v.width - size, 0] }));
      if (size > v.height) y.set(withDecay({ velocity: e.velocityY, clamp: [v.height - size, 0] }));
    },
  });

  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      touched.set(true);
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(scale);
    },
    onUpdate: (e) => {
      'worklet';
      const v = view.get();
      const before = scale.get();
      const after = Math.min(MAX_SCALE, Math.max(v.minScale, before * e.scaleChange));
      // Parmakların ortasındaki nokta yerinde kalır.
      const contentX = (e.focalX - x.get()) / before;
      const contentY = (e.focalY - y.get()) / before;
      scale.set(after);
      x.set(clampAxis(e.focalX - contentX * after, contentSize * after, v.width));
      y.set(clampAxis(e.focalY - contentY * after, contentSize * after, v.height));
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  // Aynı kamera, Skia tuvali için dönüşüm olarak.
  const cameraTransform = useDerivedValue(() => [
    { translateX: x.get() },
    { translateY: y.get() },
    { scale: scale.get() },
  ]);

  // İşaret ölçeklenen katmanın dışında durur; konumu kameradan hesaplanır.
  const pinStyle = useAnimatedStyle(() => {
    const left = x.get() + focus.x * scale.get() - pinSize / 2;
    const top = y.get() + (focus.y - pinLift) * scale.get() - pinSize;
    const v = view.get();
    // Kırpılan alanın dışında durduğu için pencereden taşınca gizlenir.
    const inside = left >= 0 && top >= 0 && left <= v.width - pinSize && top <= v.height - pinSize;
    return { left, top, opacity: inside ? 1 : 0 };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport({ width, height });
  };

  return (
    <View style={[styles.window, { backgroundColor: colors.sea }]} onLayout={onLayout}>
      {/*
        Skia tuvalleri (kıta ve işaret) kırpılan / hareket dinleyen görünümün
        DIŞINDA, doğrudan bu düz görünümün çocuğu olarak durur. Gerçek cihazda
        o görünümlerin içindeki tuvaller çizilmiyordu (simülatörde çiziliyor).
        Köşe yuvarlaması tuvalin içinde, Skia ile yapılır.
      */}
      {ready && backdrop?.(cameraTransform, viewport)}
      {ready && (
        <View style={styles.clip}>
          <GestureDetector gesture={gesture}>
            <View style={StyleSheet.absoluteFill}>
              <Animated.View style={[styles.content, { width: contentSize, height: contentSize }, contentStyle]}>
                <ZoomContext.Provider value={scale}>{children}</ZoomContext.Provider>
              </Animated.View>
            </View>
          </GestureDetector>
        </View>
      )}
      {ready && pin && (
        <Animated.View pointerEvents="none" style={[styles.pin, { width: pinSize, height: pinSize }, pinStyle]}>
          {pin}
        </Animated.View>
      )}
      <View style={styles.buttons}>
        <IconButton icon="globe" label={overviewLabel} onPress={flyToOverview} />
        <IconButton icon="location.fill" label={focusLabel} tint={colors.primary} onPress={flyToFocus} />
      </View>
    </View>
  );
}

/**
 * Harita uzaklaşınca okunaksız kalmaması gereken şeyler (tabela, bekleyen
 * penguen): harita küçüldükçe bu kutu büyür ve ekranda en az `minVisible`
 * ölçeğinde görünür. Yakın görünümde olduğu gibi kalır.
 */
export function KeepReadable({
  minVisible,
  style,
  children,
  ...rest
}: {
  minVisible: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  pointerEvents?: 'none' | 'auto';
  accessible?: boolean;
  accessibilityLabel?: string;
}) {
  const zoom = useContext(ZoomContext);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: zoom ? Math.max(1, minVisible / zoom.get()) : 1 }],
  }));
  return (
    <Animated.View {...rest} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Harita bir pencere gibi durur: köşeleri yuvarlak, içi okyanus. Bu görünüm
  // kırpmaz (içinde Skia tuvali var); kırpma `clip` katmanındadır.
  window: {
    flex: 1,
    marginTop: spacing.md,
    marginHorizontal: -spacing.sm,
    borderRadius: radii.lg,
  },
  clip: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: radii.lg, overflow: 'hidden' },
  content: { position: 'absolute', left: 0, top: 0, transformOrigin: 'top left' },
  pin: { position: 'absolute' },
  buttons: { position: 'absolute', right: spacing.md, bottom: spacing.md, gap: spacing.sm },
});
