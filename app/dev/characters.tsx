/**
 * Karakter test sahnesi (yalnızca geliştirme sürümü).
 *
 * Penguenin bütün karakterlerini, yüz ifadelerini, pozlarını, yönlerini ve
 * tahta parçalarını tek yerde gösterir. Tatlılığı birlikte değerlendirip
 * çizimi buradan ayarlıyoruz. Ayarlar → Geliştirici → Karakter sahnesi.
 *
 * Bağlantıyla belirli bir görünüm açılabilir (ekran görüntüsü almak için):
 *   pengolo://dev/characters?who=nar&mood=oops&pose=idle&dir=left&scroll=900
 */
import { Canvas } from '@shopify/react-native-skia';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { IglooSprite, RockSprite, Tile } from '@/components/board';
import { Penguin, PenguinSprite, type Mood, type Pose } from '@/components/penguin';
import type { Glasses, Hat } from '@/components/penguin/types';
import { AppText, IconButton, PressableScale, Screen } from '@/components/ui';
import { characterList, type CharacterId } from '@/data/characters';
import type { CellType, Direction, PenguinColor } from '@/engine/types';
import { useTranslation } from '@/i18n';
import { useSettings } from '@/store/settings';
import { radii, shadows, spacing, useTheme } from '@/theme';

const MOODS: Mood[] = ['happy', 'excited', 'surprised', 'oops', 'sleepy', 'proud', 'sad'];
const POSES: Pose[] = ['idle', 'slide', 'sleep', 'wave', 'dance'];
const DIRECTIONS: Direction[] = ['down', 'left', 'right', 'up'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}>
      <AppText variant="label" muted>
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** Sarılan küçük seçim düğmeleri. */
function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <PressableScale
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.surfaceSunken }]}
          >
            <AppText variant="caption" color={selected ? colors.onPrimary : colors.text}>
              {option}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Mini tahta: bütün parçalar tek tuvalde, oyundaki gibi. */
function BoardSample({ largeSymbol }: { largeSymbol: boolean }) {
  const cell = 56;
  const rows: CellType[][] = [
    ['ice', 'ice', 'ice', 'ice', 'ice', 'ice'],
    ['ice', 'rock', 'cracked', 'water', 'cracked', 'ice'],
    ['ice', 'ice', 'ice', 'ice', 'rock', 'ice'],
    ['ice', 'ice', 'ice', 'ice', 'ice', 'ice'],
  ];
  const igloos: { x: number; y: number; color: PenguinColor; smoking?: boolean }[] = [
    { x: 0, y: 0, color: 'blue', smoking: true },
    { x: 1, y: 0, color: 'orange' },
    { x: 2, y: 0, color: 'red' },
    { x: 3, y: 0, color: 'yellow' },
    { x: 4, y: 0, color: 'green' },
    { x: 5, y: 0, color: 'purple' },
  ];
  return (
    <Canvas style={{ width: cell * 6, height: cell * 4, alignSelf: 'center' }}>
      {rows.map((row, y) =>
        row.map((type, x) => (
          <Tile
            key={`${x}-${y}`}
            x={x * cell}
            y={y * cell}
            size={cell}
            type={type === 'rock' ? 'ice' : type}
            alt={(x + y) % 2 === 1}
          />
        )),
      )}
      {rows.map((row, y) =>
        row.map((type, x) =>
          type === 'rock' ? <RockSprite key={`r${x}-${y}`} x={x * cell} y={y * cell} size={cell} /> : null,
        ),
      )}
      {igloos.map((g) => (
        <IglooSprite key={g.color} x={g.x * cell} y={g.y * cell} size={cell} color={g.color} largeSymbol={largeSymbol} smoking={g.smoking} />
      ))}
      <PenguinSprite x={0} y={cell * 2} size={cell} character="piti" direction="right" largeSymbol={largeSymbol} />
      <PenguinSprite x={cell * 2} y={cell * 2} size={cell} character="nar" direction="right" pose="slide" />
      <PenguinSprite x={cell * 5} y={cell * 2} size={cell} character="nane" pose="sleep" largeSymbol={largeSymbol} />
      <PenguinSprite x={cell} y={cell * 3} size={cell} character="limon" direction="up" largeSymbol={largeSymbol} />
      <PenguinSprite x={cell * 3} y={cell * 3} size={cell} character="mandi" direction="left" mood="oops" largeSymbol={largeSymbol} />
      <PenguinSprite x={cell * 5} y={cell * 3} size={cell} character="erik" direction="left" largeSymbol={largeSymbol} />
    </Canvas>
  );
}

export default function CharactersScene() {
  const { t, language } = useTranslation();
  const largeSymbols = useSettings((s) => s.largeSymbols);
  const toggle = useSettings((s) => s.toggle);

  const params = useLocalSearchParams<{
    who?: CharacterId;
    mood?: Mood;
    pose?: Pose;
    dir?: Direction;
    scroll?: string;
    /** Kostüm denemesi: ?hat=crown&glasses=shades */
    hat?: Hat;
    glasses?: Glasses;
  }>();

  const [who, setWho] = useState<CharacterId>(params.who ?? 'piti');
  const [mood, setMood] = useState<Mood>(params.mood ?? 'happy');
  const [pose, setPose] = useState<Pose>(params.pose ?? 'idle');
  const [direction, setDirection] = useState<Direction>(params.dir ?? 'down');
  const [beanie, setBeanie] = useState(false);
  const [glasses, setGlasses] = useState(false);
  const costume = {
    hat: beanie ? ('beanie' as const) : params.hat,
    glasses: glasses ? ('round' as const) : params.glasses,
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <AppText variant="heading">{t('dev.characters')}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: Number(params.scroll ?? 0) }}
      >
        {/* Büyük önizleme + denetimler */}
        <Section title={t('dev.preview')}>
          <View style={styles.preview}>
            <Penguin
              character={who}
              mood={mood}
              pose={pose}
              direction={direction}
              costume={costume}
              largeSymbol={largeSymbols}
              size={200}
            />
          </View>
          <Chips value={who} options={characterList.map((c) => c.id)} onChange={setWho} />
          <Chips value={mood} options={MOODS} onChange={setMood} />
          <Chips value={pose} options={POSES} onChange={setPose} />
          <Chips value={direction} options={DIRECTIONS} onChange={setDirection} />
          <View style={styles.switchRow}>
            <AppText variant="label">{t('dev.costume')}: beanie</AppText>
            <Switch value={beanie} onValueChange={setBeanie} />
          </View>
          <View style={styles.switchRow}>
            <AppText variant="label">{t('dev.costume')}: glasses</AppText>
            <Switch value={glasses} onValueChange={setGlasses} />
          </View>
          <View style={styles.switchRow}>
            <AppText variant="label">{t('dev.largeSymbols')}</AppText>
            <Switch value={largeSymbols} onValueChange={() => toggle('largeSymbols')} />
          </View>
        </Section>

        {/* Altı karakter: isim + kişilik; her biri kendi boşta hareketini yapar */}
        <Section title={t('dev.cast')}>
          <View style={styles.grid}>
            {characterList.map((c) => (
              <View key={c.id} style={styles.cell}>
                <Penguin character={c.id} size={96} largeSymbol={largeSymbols} label={c.name[language]} />
                <AppText variant="label">{c.name[language]}</AppText>
                <AppText variant="caption" muted>
                  {t(`personality.${c.personality}`)}
                </AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section title={t('dev.moods')}>
          <View style={styles.grid}>
            {MOODS.map((m) => (
              <View key={m} style={styles.cell}>
                <Penguin character={who} mood={m} size={84} interactive={false} />
                <AppText variant="caption" muted>
                  {m}
                </AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section title={t('dev.poses')}>
          {(['idle', 'slide'] as const).map((p) => (
            <View key={p} style={styles.grid}>
              {DIRECTIONS.map((d) => (
                <View key={d} style={styles.cell}>
                  <Penguin character={who} pose={p} direction={d} size={72} interactive={false} />
                  <AppText variant="caption" muted>
                    {p} · {d}
                  </AppText>
                </View>
              ))}
            </View>
          ))}
          <View style={styles.grid}>
            {(['sleep', 'wave', 'dance'] as const).map((p) => (
              <View key={p} style={styles.cell}>
                <Penguin character={who} pose={p} size={84} interactive={false} />
                <AppText variant="caption" muted>
                  {p}
                </AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section title={t('dev.board')}>
          <BoardSample largeSymbol={largeSymbols} />
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerSpacer: { width: 48 },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: { borderRadius: radii.md, padding: spacing.md, gap: spacing.sm + spacing.xs },
  preview: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm + spacing.xs,
    minHeight: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: spacing.md,
    paddingTop: spacing.lg,
  },
  cell: { alignItems: 'center', minWidth: 76, gap: 2 },
});
