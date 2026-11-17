/**
 * Oyun tahtası: bütün karolar, kayalar, igloolar ve penguenler tek Skia
 * tuvalinde. Dokunmayı hücreye çevirir ve motor olaylarını canlandırır.
 *
 * Akış: ekran bir `BoardSignal` verir →
 *   reset  : görünümü mantıksal durumdan baştan kurar (geri al, baştan başla)
 *   move   : olayları zaman çizelgesine dizer (kayma → çarpma / igloya giriş)
 *   reject : "hayır" sallanması
 * Mantıksal durum hemen değişir; burada gösterilen, ona doğru oynayan görüntüdür.
 */
import { Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PenguinSprite } from '@/components/penguin';

import type { CharacterId } from '@/data/characters';
import type { CellType, GameState, LevelDef, PenguinColor, Vec } from '@/engine';
import type { BoardSignal } from '@/game/useLevelSession';
import { audio, type SoundName } from '@/services/audio';
import { haptics } from '@/services/haptics';

import { BoardPenguin, type PenguinView } from './BoardPenguin';
import { IglooSprite } from './IglooSprite';
import { RockSprite } from './RockSprite';
import { SnowTrail } from './SnowTrail';
import { Tile } from './Tile';

export interface BoardProps {
  level: LevelDef;
  state: GameState;
  signal: BoardSignal;
  /** Tahtanın sığması gereken alan. */
  maxWidth: number;
  maxHeight: number;
  hintPenguinId?: string | null;
  /** İpucu penguenin üstünde "dokun" eli göster (öğretici). */
  showHand?: boolean;
  largeSymbols?: boolean;
  /** Ses ve titreşim yok (tanıtım animasyonlarındaki gösterim tahtası). */
  silent?: boolean;
  /**
   * Bölüm bitince penguenler igloolardan çıkıp dans etsin; `onFinished` dans
   * bittikten sonra çağrılır. Dalga aralarında kapalıdır (akışı yavaşlatmasın).
   */
  celebrate?: boolean;
  onTapPenguin: (penguinId: string) => void;
  /** Bölüm bitti ve son animasyon tamamlandı. */
  onFinished?: () => void;
}

/** Kayma süresi: kısa mesafede bile hissedilir, uzun mesafede sıkmaz. */
const slideMs = (distance: number) => 120 + 85 * distance;
const WAVE_MS = 520;
const OOPS_MS = 750;
const MAX_CELL = 88;
/** Bölüm sonu dansının süresi: bitiş kartı bundan sonra açılır. */
const PARTY_MS = 1100;

interface Trail {
  id: number;
  from: Vec;
  to: Vec;
  ms: number;
}

function viewsFromState(state: GameState): Record<string, PenguinView> {
  const views: Record<string, PenguinView> = {};
  for (const p of state.penguins) {
    views[p.id] = {
      x: p.x,
      y: p.y,
      moveMs: 0,
      dir: p.dir,
      pose: p.status === 'asleep' ? 'sleep' : 'idle',
      mood: 'happy',
      gone: p.status === 'home',
      squashTick: 0,
      nopeTick: 0,
    };
  }
  return views;
}

export function Board({
  level,
  state,
  signal,
  maxWidth,
  maxHeight,
  hintPenguinId,
  showHand = false,
  largeSymbols = false,
  silent = false,
  celebrate = false,
  onTapPenguin,
  onFinished,
}: BoardProps) {
  const cols = state.width;
  const rows = state.height;
  const cell = Math.max(24, Math.floor(Math.min(maxWidth / (cols + 0.5), maxHeight / (rows + 0.9), MAX_CELL)));
  // Kenar payı: üst satırdaki bayrak, "zzz" ve yıldızlar kırpılmasın.
  const padX = cell * 0.25;
  const padTop = cell * 0.55;
  const padBottom = cell * 0.35;

  const [views, setViews] = useState(() => viewsFromState(state));
  const [cells, setCells] = useState<readonly CellType[]>(state.cells);
  const [smoking, setSmoking] = useState<Record<string, boolean>>({});
  const [trail, setTrail] = useState<Trail | null>(null);
  /** Bölüm sonu: penguenler igloolardan çıkmış dans ediyor. */
  const [party, setParty] = useState(false);

  /** Bekleyen zamanlayıcılar; sıfırlamada ve ekrandan çıkarken iptal edilir. */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Kayma sürerken yeni dokunuş alınmaz. */
  const busyUntil = useRef(0);
  const stateRef = useRef(state);
  const onFinishedRef = useRef(onFinished);
  const celebrateRef = useRef(celebrate);
  useEffect(() => {
    stateRef.current = state;
    onFinishedRef.current = onFinished;
    celebrateRef.current = celebrate;
  });

  // Ses ve titreşim tek kapıdan: sessiz modda ikisi de kapalı.
  const silentRef = useRef(silent);
  useEffect(() => {
    silentRef.current = silent;
  });
  const sfx = useCallback((name: SoundName) => {
    if (!silentRef.current) audio.play(name);
  }, []);
  const buzz = useCallback((kind: keyof typeof haptics) => {
    if (!silentRef.current) haptics[kind]();
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const patch = useCallback((id: string, change: Partial<PenguinView>) => {
    setViews((all) => (all[id] ? { ...all, [id]: { ...all[id], ...change } } : all));
  }, []);

  // --- Sinyali canlandır ---
  useEffect(() => {
    const now = stateRef.current;

    if (signal.kind === 'reset') {
      clearTimers();
      busyUntil.current = 0;
      const fresh = viewsFromState(now);
      // Yeni dalga: penguenler önce görünmez kurulur, sonra belirerek gelir.
      const hidden = Object.fromEntries(
        Object.entries(fresh).map(([id, view]) => [id, { ...view, gone: true }]),
      );
      setViews(signal.appear ? hidden : fresh);
      if (signal.appear) {
        later(60, () => setViews(fresh));
        busyUntil.current = Date.now() + 380;
        sfx('wake');
      }
      setCells(now.cells);
      setSmoking({});
      setTrail(null);
      setParty(false);
      return;
    }

    if (signal.kind === 'reject') {
      // Uyuyan ya da önü kapalı penguen: sevimli bir "hayır".
      setViews((all) => {
        const v = all[signal.penguinId];
        return v ? { ...all, [signal.penguinId]: { ...v, nopeTick: v.nopeTick + 1 } } : all;
      });
      sfx('nope');
      buzz('nope');
      return;
    }

    const slide = signal.events.find((e) => e.type === 'slide');
    if (!slide) {
      // Kayma yok: önü kapalı penguen yerinde döndü ("çarpınca dön" kuralı).
      const turn = signal.events.find((e) => e.type === 'turn');
      if (turn) {
        setViews((all) => {
          const v = all[turn.penguinId];
          return v ? { ...all, [turn.penguinId]: { ...v, dir: turn.to, squashTick: v.squashTick + 1 } } : all;
        });
        sfx('tap');
        buzz('tap');
        busyUntil.current = Date.now() + 120;
      }
      return;
    }
    const id = slide.penguinId;
    const ms = slideMs(slide.distance);
    busyUntil.current = Date.now() + ms;

    // 1) Kayma başlar.
    patch(id, { x: slide.to.x, y: slide.to.y, moveMs: ms, pose: 'slide', mood: 'excited' });
    setTrail({ id: signal.id, from: slide.from, to: slide.to, ms });
    sfx('tap');
    sfx('slide');
    buzz('tap');

    let endsAt = ms;
    for (const event of signal.events) {
      switch (event.type) {
        // 2) Çatlak buz: penguen üstünden ayrıldığı anda kırılır.
        case 'crackBreak':
          later(((event.step + 0.6) / slide.distance) * ms, () => {
            setCells((prev) => {
              const next = [...prev];
              next[event.y * cols + event.x] = 'water';
              return next;
            });
            sfx('crack');
          });
          break;

        // 3a) Çarpıp durma: ezilme + "oops"; çarptığı penguenle bakışma.
        case 'bump': {
          const other = event.obstacle.kind === 'penguin' ? event.obstacle.penguinId : null;
          later(ms, () => {
            setViews((all) => {
              const next = { ...all };
              const me = next[id];
              if (me) next[id] = { ...me, moveMs: 0, pose: 'idle', mood: 'oops', squashTick: me.squashTick + 1 };
              const them = other ? next[other] : undefined;
              if (other && them && them.pose !== 'sleep') next[other] = { ...them, mood: 'surprised' };
              return next;
            });
            sfx('bump');
            buzz('bump');
          });
          later(ms + OOPS_MS, () => {
            patch(id, { mood: 'happy' });
            if (other) patch(other, { mood: 'happy' });
          });
          endsAt = Math.max(endsAt, ms + 250);
          break;
        }

        // Çarpınca döner: yön oku çarpma anında yeni yönü gösterir.
        case 'turn':
          later(ms, () => patch(id, { dir: event.to }));
          break;

        // Uyuyan penguen çarpılınca şaşkınlıkla uyanır.
        case 'wakeUp':
          later(ms, () => {
            patch(event.penguinId, { pose: 'idle', mood: 'surprised' });
            sfx('wake');
          });
          later(ms + OOPS_MS, () => patch(event.penguinId, { mood: 'happy' }));
          break;

        // 3b) Igloya giriş: kapıda el sallar, içeri girer, bacadan kalp çıkar.
        case 'enterIgloo':
          later(ms, () => {
            patch(id, { moveMs: 0, pose: 'wave', mood: 'happy' });
            sfx('enter');
            buzz('success');
          });
          later(ms + WAVE_MS, () => {
            patch(id, { gone: true });
            setSmoking((s) => ({ ...s, [event.iglooId]: true }));
          });
          later(ms + WAVE_MS + 2600, () => setSmoking((s) => ({ ...s, [event.iglooId]: false })));
          endsAt = Math.max(endsAt, ms + WAVE_MS + 350);
          break;

        // Bölüm bitti: önce küçük bir dans, sonra bitiş kartı.
        case 'gameOver':
          if (celebrateRef.current) {
            later(endsAt + 150, () => {
              setParty(true);
              buzz('success');
            });
            later(endsAt + 150 + PARTY_MS, () => onFinishedRef.current?.());
          } else {
            later(endsAt + 150, () => onFinishedRef.current?.());
          }
          break;
      }
    }
    // Yalnızca yeni sinyalde çalışır; durum ve geri çağrılar ref'ten okunur.
  }, [signal, cols, patch, later, clearTimers, sfx, buzz]);

  const handlePress = (e: GestureResponderEvent) => {
    if (Date.now() < busyUntil.current) return;
    const x = Math.floor((e.nativeEvent.locationX - padX) / cell);
    const y = Math.floor((e.nativeEvent.locationY - padTop) / cell);
    const hit = state.penguins.find((p) => p.status !== 'home' && p.x === x && p.y === y);
    if (hit) onTapPenguin(hit.id);
  };

  const defs = new Map(level.penguins.map((p, i) => [p.id ?? `p${i}`, p]));
  // Alttaki satır üsttekinin önünde: çizim sırası y'ye göre.
  const ordered = [...state.penguins].sort((a, b) => (views[a.id]?.y ?? a.y) - (views[b.id]?.y ?? b.y));
  const hinted = hintPenguinId ? views[hintPenguinId] : undefined;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="none"
      style={{ width: cols * cell + padX * 2, height: rows * cell + padTop + padBottom }}
    >
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <RoundedRect
          x={padX - cell * 0.1}
          y={padTop - cell * 0.1}
          width={cols * cell + cell * 0.2}
          height={rows * cell + cell * 0.2}
          r={cell * 0.26}
          color="#A9CFEF"
        />
        {cells.map((type, i) => {
          const x = i % cols;
          const y = Math.floor(i / cols);
          return (
            <Tile
              key={i}
              x={padX + x * cell}
              y={padTop + y * cell}
              size={cell}
              type={type === 'rock' ? 'ice' : type}
              alt={(x + y) % 2 === 1}
            />
          );
        })}
        {cells.map((type, i) =>
          type === 'rock' ? (
            <RockSprite key={`r${i}`} x={padX + (i % cols) * cell} y={padTop + Math.floor(i / cols) * cell} size={cell} />
          ) : null,
        )}
        {state.igloos.map((g) => (
          <IglooSprite
            key={g.id}
            x={padX + g.x * cell}
            y={padTop + g.y * cell}
            size={cell}
            color={(g.color ?? 'blue') as PenguinColor}
            largeSymbol={largeSymbols}
            smoking={!!smoking[g.id]}
          />
        ))}
        {/* Bölüm sonu: her igloonun kapısında sahibi dans eder */}
        {party &&
          state.igloos.map((g) => (
            <IglooParty
              key={`party-${g.id}`}
              x={padX + g.x * cell}
              y={padTop + g.y * cell}
              cell={cell}
              color={(g.color ?? 'blue') as PenguinColor}
              largeSymbol={largeSymbols}
            />
          ))}
        {/* Penguenler ve kar zerreleri: tahtanın sol üst köşesine göre konumlanır */}
        <BoardLayer x={padX} y={padTop}>
          {trail && <SnowTrail key={trail.id} from={trail.from} to={trail.to} ms={trail.ms} cell={cell} />}
          {ordered.map((p) => {
            const view = views[p.id];
            if (!view) return null;
            return (
              <BoardPenguin
                key={p.id}
                view={view}
                cell={cell}
                character={defs.get(p.id)?.character as CharacterId | undefined}
                color={p.color}
                largeSymbol={largeSymbols}
                hinted={hintPenguinId === p.id}
              />
            );
          })}
        </BoardLayer>
      </Canvas>

      {showHand && hinted && !hinted.gone && (
        <TapHand left={padX + (hinted.x + 0.5) * cell} top={padTop + (hinted.y + 0.55) * cell} size={cell * 0.6} />
      )}
    </Pressable>
  );
}

/**
 * Igloonun kapısından çıkıp dans eden küçük penguen. Kapının dibinden
 * esneyerek büyür; igloonun önünde durduğu için kapıdan çıkmış görünür.
 */
function IglooParty({
  x,
  y,
  cell,
  color,
  largeSymbol,
}: {
  x: number;
  y: number;
  cell: number;
  color: PenguinColor;
  largeSymbol: boolean;
}) {
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.set(withSpring(1, { damping: 9, stiffness: 220, mass: 0.6 }));
  }, [pop]);
  const size = cell * 0.62;
  // Büyüme merkezi: kapının eşiği.
  const origin = { x: x + cell / 2, y: y + cell * 0.9 };
  const transform = useDerivedValue(() => [{ scale: pop.value }]);
  return (
    <Group transform={transform} origin={origin}>
      <PenguinSprite
        x={x + (cell - size) / 2}
        y={y + cell * 0.92 - size}
        size={size}
        color={color}
        pose="dance"
        mood="excited"
        largeSymbol={largeSymbol}
      />
    </Group>
  );
}

/** Tuval içinde öteleme. */
function BoardLayer({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return <Group transform={[{ translateX: x }, { translateY: y }]}>{children}</Group>;
}

/** Öğretici: "buraya dokun" eli, hafifçe aşağı yukarı oynar. */
function TapHand({ left, top, size }: { left: number; top: number; size: number }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 450 })), -1));
  }, [bob]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.get() * -size * 0.25 }, { scale: 1 - bob.get() * 0.08 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.hand, { left, top }, style]}>
      <SymbolView name="hand.point.up.left.fill" size={size} tintColor="#1B2A4A" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hand: { position: 'absolute' },
});
