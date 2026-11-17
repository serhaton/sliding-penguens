/**
 * Dünya haritası: okyanusun ortasında Antarktika kıtası ve üstünde, güney
 * kıyısından kuzeye doğru kıvrılan bölüm yolu.
 *
 * - Kıta episode'lara bölünmüştür: her episode yatay bir kuşak. Bölümleri hazır
 *   olan episode'da numaralı düğümler vardır (bitenlerde yıldızlar, sıradakinde
 *   bekleyen penguen, ötesinde kilit). Henüz hazır olmayan episode'lar soluk bir
 *   yol ve kilitli bir tabelayla görünür: oyuncu devamının geleceğini bilir.
 * - Harita önce uzaktan, kıtanın tamamıyla açılır (üç episode ve penguenin yeri
 *   tek bakışta görünür), sonra kalınan bölüme yakınlaşır. Kaydırma, iki
 *   parmakla yakınlaştırma ve "kaldığım yere dön" düğmesi MapViewport'tadır.
 *
 * Geometri saf fonksiyondadır (layout.ts); bu bileşen yalnızca çizer.
 */
import {
  Canvas,
  DashPathEffect,
  Group,
  Line,
  Oval,
  Path,
  Rect,
  rect,
  rrect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Penguin } from '@/components/penguin';
import { AppText, PressableScale } from '@/components/ui';
import type { CharacterId } from '@/data/characters';
import { levelSections } from '@/data/levels';
import { antarctica } from '@/data/continents';
import type { PenguinColor } from '@/engine';
import type { Progress } from '@/game/progress';
import { useTranslation, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { fonts, penguinColors, radii, shadows, spacing, useTheme } from '@/theme';

import { coastline, mapLayout } from './layout';
import { KeepReadable, MapViewport, type MapCameraTransform } from './MapViewport';

/**
 * Kıtanın kenarı ve çevresindeki okyanus payı (pt). Pay geniştir: harita kıyının
 * ötesine rahatça kaydırılabilsin, kenardaki düğümler ekranın ortasına gelebilsin.
 */
const CONTINENT = 1800;
const OCEAN = 300;
const CONTENT = CONTINENT + OCEAN * 2;

/** Episode 1'in bölgeleri (A, B, C): renk ve ad. */
const SECTION_STYLE: Record<string, { color: PenguinColor; titleKey: TranslationKey }> = {
  A: { color: 'blue', titleKey: 'map.sectionA' },
  B: { color: 'purple', titleKey: 'map.sectionB' },
  C: { color: 'green', titleKey: 'map.sectionC' },
};

const NODE = 60;
const CURRENT_NODE = 72;
const DOT = 10;
/** Bölümü henüz hazır olmayan düğümün boyu. */
const GHOST = 18;
/** Sıradaki düğümde bekleyen penguenin boyu. */
const PENGUIN = 56;

interface MapNode {
  id: string;
  number: number;
  color: PenguinColor;
  /** Bölgenin ilk bölümüyse bölge adı. */
  sectionTitleKey?: TranslationKey;
}

/** Hazır bölümler, yol sırasıyla (şimdilik yalnızca Episode 1). */
const MAP_NODES: readonly MapNode[] = levelSections.flatMap((section) => {
  const style = SECTION_STYLE[section.key]!;
  return section.levels.map((level, i) => ({
    id: level.id,
    number: section.first + i,
    color: style.color,
    sectionTitleKey: i === 0 ? style.titleKey : undefined,
  }));
});

const EPISODES = antarctica.episodes;

const LAYOUT = mapLayout(
  EPISODES.map((episode) => episode.levelCount),
  CONTINENT,
);

/** Kıyı çizgisinden yumuşak, kapalı bir yol: köşeler ara noktalardan geçen eğrilerle yuvarlanır. */
function continentPath() {
  const points = coastline(CONTINENT);
  const mid = (i: number) => {
    const a = points[i % points.length]!;
    const b = points[(i + 1) % points.length]!;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const start = mid(points.length - 1);
  const builder = Skia.PathBuilder.Make().moveTo(start.x, start.y);
  points.forEach((p, i) => {
    const next = mid(i);
    builder.quadTo(p.x, p.y, next.x, next.y);
  });
  return builder.close().detach();
}

/** Okyanustaki buz parçaları (süs). Konum kıta kenarının oranı, boyut pt. */
const FLOES = [
  { x: 0.01, y: 0.2, w: 110, h: 40 },
  { x: 0.3, y: 0.06, w: 90, h: 32 },
  { x: 0.86, y: 0.09, w: 130, h: 46 },
  { x: 0.93, y: 0.03, w: 70, h: 26 },
  { x: 0.41, y: 0.86, w: 80, h: 30 },
  { x: 0.02, y: 0.84, w: 140, h: 50 },
  { x: 0.88, y: 0.9, w: 120, h: 42 },
] as const;

export interface WorldMapProps {
  progress: Progress;
  /** Sıradaki düğümde bekleyen penguen. */
  character?: CharacterId;
  onOpenLevel: (levelId: string) => void;
  /** Yalnızca geliştirme: açılışta yakınlaşma; kıtanın tamamı görünür kalsın. */
  stayFar?: boolean;
}

export function WorldMap({ progress, character = 'piti', onOpenLevel, stayFar = false }: WorldMapProps) {
  const { t } = useTranslation();
  const { colors, isNight } = useTheme();
  const land = useMemo(() => continentPath(), []);

  const currentIndex = progress.currentNumber - 1;
  const here = LAYOUT.nodes[currentIndex] ?? LAYOUT.nodes[0]!;

  /**
   * Kıta: sığ kıyı suyu, kar, episode kuşakları. Pencere boyutunda sabit bir
   * tuvalde çizilir; kaydırma ve yakınlaştırma tuvalin içinde uygulanır.
   * (Ölçeklenen görünümün içindeki Skia tuvali gerçek cihazda çizilmiyordu.)
   */
  const backdrop = (camera: MapCameraTransform, size: { width: number; height: number }) => (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Pencerenin yuvarlak köşeleri: tuval kendi kendini kırpar. */}
      <Group clip={rrect(rect(0, 0, size.width, size.height), radii.lg, radii.lg)}>
        <Group transform={camera}>
          <Group transform={[{ translateX: OCEAN }, { translateY: OCEAN }]}>
            {FLOES.map((f, i) => (
              <Oval
                key={i}
                x={f.x * CONTINENT}
                y={f.y * CONTINENT}
                width={f.w}
                height={f.h}
                color={colors.land}
                opacity={0.55}
              />
            ))}
            <Path path={land} color={colors.seaShallow} style="stroke" strokeWidth={56} strokeJoin="round" />
            <Path path={land} color={colors.land} />
            <Group clip={land}>
              {EPISODES.map((episode, w) => {
                const band = LAYOUT.episodes[w]!;
                return (
                  <Rect
                    key={episode.id}
                    x={0}
                    y={band.top}
                    width={CONTINENT}
                    height={band.bottom - band.top}
                    color={penguinColors[episode.color].main}
                    opacity={isNight ? 0.16 : 0.1}
                  />
                );
              })}
              {/* Episode sınırları: kesikli çizgi */}
              {LAYOUT.episodes.slice(1).map((band, w) => (
                <Line
                  key={w}
                  p1={vec(0, band.bottom)}
                  p2={vec(CONTINENT, band.bottom)}
                  color={colors.textMuted}
                  opacity={0.45}
                  strokeWidth={4}
                  strokeCap="round"
                >
                  <DashPathEffect intervals={[14, 16]} />
                </Line>
              ))}
            </Group>
          </Group>
        </Group>
      </Group>
    </Canvas>
  );

  return (
    <MapViewport
      contentSize={CONTENT}
      // Uzak görünümde kıtanın çevresinde ince bir okyanus şeridi kalır.
      inset={OCEAN - 50}
      focus={{ x: OCEAN + here.x, y: OCEAN + here.y }}
      focusLabel={t('map.focus')}
      overviewLabel={t('map.overview')}
      stayFar={stayFar}
      backdrop={backdrop}
      // Sıradaki düğümde bekleyen penguen: harita küçülse de aynı boyda kalır.
      pin={<Penguin character={character} size={PENGUIN} interactive={false} />}
      pinSize={PENGUIN}
      // Penguenin ayakları düğümün üst kenarına basar.
      pinLift={CURRENT_NODE / 2 - 6}
    >
      {/* Ayak izleri */}
      {LAYOUT.trail.map((dots, i) => {
        const node = MAP_NODES[i];
        const walked = i < currentIndex;
        return dots.map((dot, d) => (
          <View
            key={`${i}-${d}`}
            style={[
              styles.dot,
              {
                left: OCEAN + dot.x - DOT / 2,
                top: OCEAN + dot.y - DOT / 2,
                backgroundColor: walked && node ? penguinColors[node.color].main : colors.textMuted,
                opacity: walked ? 1 : 0.35,
              },
            ]}
          />
        ));
      })}

      {/* Bölümü henüz hazır olmayan düğümler: soluk yol */}
      {LAYOUT.nodes.slice(MAP_NODES.length).map((point, i) => (
        <View
          key={`g${i}`}
          style={[
            styles.ghost,
            {
              left: OCEAN + point.x - GHOST / 2,
              top: OCEAN + point.y - GHOST / 2,
              backgroundColor: colors.textMuted,
            },
          ]}
        />
      ))}

      {/* Düğümler */}
      {MAP_NODES.map((node, i) => {
        const point = LAYOUT.nodes[i]!;
        const status = progress.statusOf(node.id);
        const stars = progress.starsOf(node.id);
        const tone = penguinColors[node.color];
        const size = status === 'current' ? CURRENT_NODE : NODE;
        const locked = status === 'locked';
        const label = locked
          ? `${t('level.title', { n: node.number })}, ${t('map.locked')}`
          : `${t('level.title', { n: node.number })}, ${stars} / 3`;

        return (
          <View
            key={node.id}
            style={[
              styles.node,
              {
                left: OCEAN + point.x - size / 2,
                top: OCEAN + point.y - size / 2,
                width: size,
              },
              // Bekleyen penguen komşu düğümlerin arkasında kalmasın.
              status === 'current' && styles.front,
            ]}
          >
            <PressableScale
              accessibilityLabel={label}
              accessibilityState={{ disabled: locked }}
              // Kilitli düğüm basılabilir kalır: "henüz değil" titreşimi verir.
              haptic={!locked}
              onPress={() => (locked ? haptics.nope() : onOpenLevel(node.id))}
            >
              <View
                style={[
                  styles.circle,
                  shadows.soft(colors.shadow),
                  { width: size, height: size },
                  status === 'done' && {
                    backgroundColor: tone.main,
                    borderColor: tone.dark,
                  },
                  status === 'current' && {
                    backgroundColor: colors.surface,
                    borderColor: tone.main,
                  },
                  locked && {
                    backgroundColor: colors.surfaceSunken,
                    borderColor: colors.surface,
                  },
                ]}
              >
                {locked ? (
                  <SymbolView name="lock.fill" size={20} weight="bold" tintColor={colors.textMuted} />
                ) : (
                  <AppText variant="heading" color={status === 'done' ? colors.onPrimary : tone.dark}>
                    {node.number}
                  </AppText>
                )}
              </View>
            </PressableScale>

            {status === 'done' && (
              <View style={styles.stars} pointerEvents="none">
                {[1, 2, 3].map((n) => (
                  <SymbolView
                    key={n}
                    name="star.fill"
                    size={14}
                    tintColor={n <= stars ? colors.coin : colors.surfaceSunken}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* Bölge adları (Episode 1'in A, B, C bölgeleri) */}
      {MAP_NODES.map((node, i) => {
        if (!node.sectionTitleKey) return null;
        const point = LAYOUT.nodes[i]!;
        // Düğümün üstünde durur; penguen o düğümde bekliyorsa altına iner.
        const dy = i === currentIndex && !progress.allDone ? 46 : -66;
        return (
          <View
            key={`s${node.id}`}
            pointerEvents="none"
            style={[
              styles.label,
              {
                left: OCEAN + point.x - LABEL_WIDTH / 2,
                top: OCEAN + point.y + dy,
              },
            ]}
          >
            <View style={[styles.sectionPill, { backgroundColor: penguinColors[node.color].main }]}>
              <AppText variant="caption" color={colors.onPrimary} style={styles.sectionText}>
                {t(node.sectionTitleKey)}
              </AppText>
            </View>
          </View>
        );
      })}

      {/* Episode tabelaları: hazır olmayan episode'lar kilitli ve "çok yakında" */}
      {EPISODES.map((episode, w) => {
        const ready = MAP_NODES.length > LAYOUT.episodeOf.indexOf(w);
        if (ready) return null;
        const center = LAYOUT.episodes[w]!.center;
        return (
          <KeepReadable
            minVisible={0.6}
            key={`w${episode.id}`}
            accessible
            accessibilityLabel={`${t('map.episode', { n: episode.id })}, ${t(episode.titleKey)}, ${t('soon.title')}`}
            style={[
              styles.label,
              {
                left: OCEAN + center.x - LABEL_WIDTH / 2,
                top: OCEAN + center.y - 58,
              },
            ]}
          >
            <View style={[styles.sign, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}>
              <View style={[styles.signLock, { backgroundColor: penguinColors[episode.color].main }]}>
                <SymbolView name="lock.fill" size={18} weight="bold" tintColor={colors.onPrimary} />
              </View>
              <AppText variant="caption" muted>
                {t('map.episode', { n: episode.id })}
              </AppText>
              <AppText variant="heading" center>
                {t(episode.titleKey)}
              </AppText>
              <AppText variant="caption" muted>
                {t('soon.title')}
              </AppText>
            </View>
          </KeepReadable>
        );
      })}
    </MapViewport>
  );
}

/** Etiketlerin ortalandığı kutunun genişliği. */
const LABEL_WIDTH = 260;

const styles = StyleSheet.create({
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
  ghost: {
    position: 'absolute',
    width: GHOST,
    height: GHOST,
    borderRadius: GHOST / 2,
    opacity: 0.3,
  },
  node: { position: 'absolute', alignItems: 'center' },
  front: { zIndex: 1 },
  circle: {
    borderRadius: radii.pill,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stars: { flexDirection: 'row', gap: 1, marginTop: spacing.xs },
  label: { position: 'absolute', width: LABEL_WIDTH, alignItems: 'center' },
  sectionPill: {
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  sectionText: { fontFamily: fonts.extraBold },
  sign: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm + spacing.xs,
    borderRadius: radii.md,
  },
  signLock: {
    position: 'absolute',
    top: -18,
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
