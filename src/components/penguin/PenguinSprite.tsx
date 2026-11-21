/**
 * Penguen çizimi — bir Skia tuvalinin İÇİNDE kullanılır (kendi tuvali yoktur).
 * Tahta, bütün penguenleri tek tuvalde bu bileşenle çizer; tek başına bir
 * penguen göstermek için `Penguin` sarmalayıcısını kullan.
 *
 * Çizim 100×100'lük tasarım alanında yapılır, (x, y, size) ile yerleştirilir.
 * Görsel katman buradan ibaret: ileride bir illüstratörün çizimleriyle (Rive
 * ya da sprite) değiştirmek için yalnızca bu klasörü değiştirmek yeter.
 */
import { Circle, Group, LinearGradient, Line, Oval, Path, RoundedRect, Skia, useClock, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { SymbolMark, symbolPath } from '@/components/board/symbols';
import { characterForColor, characters, type SymbolKind } from '@/data/characters';
import type { Direction } from '@/engine/types';
import { penguinColors } from '@/theme/colors';

import { HairLayer, HatLayer, SCARF_GRADIENTS } from './costumes';
import { Face } from './Face';
import { computeMotion, type Motion } from './motion';
import { INK } from './palette';
import type { Costume, Mood, PenguinSpriteProps, Pose } from './types';

/** Yöne göre yüzün kafa içindeki kayması (ayakta). */
const LOOK: Record<Direction, { x: number; y: number }> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -5 },
  left: { x: -6.5, y: 0 },
  right: { x: 6.5, y: 0 },
};

/** Kayma pozunda gövdenin dönme açısı (0 = sağa). */
const HEADING: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

const SHADOW = '#1B2A4A';

export function PenguinSprite({
  x = 0,
  y = 0,
  size,
  character,
  color,
  direction = 'down',
  mood = 'happy',
  pose = 'idle',
  costume,
  showSymbol = true,
  largeSymbol = false,
  hop,
  clock: sharedClock,
}: PenguinSpriteProps) {
  const who = character ? characters[character] : characterForColor(color ?? 'blue');
  const scarf = penguinColors[color ?? who.color];
  const symbol = characterForColor(color ?? who.color).symbol;
  const personality = who.personality;

  const ownClock = useClock();
  const clock = sharedClock ?? ownClock;

  const motion = useDerivedValue<Motion>(() =>
    computeMotion(clock.value, personality, pose, hop ? hop.value : 0),
  );

  const placement = [{ translateX: x }, { translateY: y }, { scale: size / 100 }];

  if (pose === 'slide') {
    return (
      <Group transform={placement}>
        <SlideBody
          direction={direction}
          mood={mood}
          motion={motion}
          clock={clock}
          scarf={scarf}
          costume={costume}
        />
      </Group>
    );
  }

  return (
    <Group transform={placement}>
      <StandingBody
        direction={direction}
        mood={mood}
        pose={pose}
        motion={motion}
        clock={clock}
        scarf={scarf}
        symbol={showSymbol ? symbol : null}
        largeSymbol={largeSymbol}
        costume={costume}
      />
    </Group>
  );
}

interface BodyProps {
  direction: Direction;
  mood: Mood;
  motion: SharedValue<Motion>;
  clock: SharedValue<number>;
  scarf: { main: string; dark: string; light: string };
  costume?: Costume;
}

// ---------------------------------------------------------------------------
// Ayakta (idle, sleep, wave, dance)
// ---------------------------------------------------------------------------

function StandingBody({
  direction,
  mood,
  pose,
  motion,
  clock,
  scarf,
  symbol,
  largeSymbol,
  costume,
}: BodyProps & { pose: Pose; symbol: SymbolKind | null; largeSymbol: boolean }) {
  const shapes = useMemo(() => {
    // Atkı: boynu saran kavisli bant + sağdan sarkan uç.
    const band = Skia.PathBuilder.Make()
      .moveTo(22, 55).quadTo(50, 66, 78, 55).quadTo(81, 60, 79, 65)
      .quadTo(50, 77, 21, 65).quadTo(19, 60, 22, 55).close().detach();
    const tail = Skia.PathBuilder.Make()
      .moveTo(60, 67).lineTo(71, 65).quadTo(74, 76, 72, 86)
      .lineTo(62, 87).quadTo(63, 77, 60, 67).close().detach();
    return { band, tail };
  }, []);

  const bodyTransform = useDerivedValue(() => {
    const m = motion.value;
    return [{ translateY: m.ty }, { rotate: m.rot }, { scaleX: m.sx }, { scaleY: m.sy }];
  });
  // Gölge: penguen yükseldikçe küçülür.
  const shadowTransform = useDerivedValue(() => [{ scale: 1 + motion.value.ty / 56 }]);
  const leftWing = useDerivedValue(() => [{ rotate: 0.3 + motion.value.wingL }]);
  const rightWing = useDerivedValue(() => [{ rotate: -0.3 - motion.value.wingR }]);
  const leftFoot = useDerivedValue(() => [{ translateY: -motion.value.footL }]);
  const rightFoot = useDerivedValue(() => [{ translateY: -motion.value.footR }]);

  const look = LOOK[direction];
  // Özel atkı (gökkuşağı vb.): düz renk yerine renk geçişi.
  const fancy = costume?.scarf ? SCARF_GRADIENTS[costume.scarf] : null;
  const symbolR = largeSymbol ? 5.2 : 3.4;

  return (
    <>
      <Group transform={shadowTransform} origin={vec(50, 94)}>
        <Oval x={24} y={90} width={52} height={8} color={SHADOW} opacity={0.14} />
      </Group>

      <Group transform={bodyTransform} origin={vec(50, 94)}>
        {/* Paytak ayaklar */}
        <Group transform={leftFoot}>
          <Oval x={29} y={86} width={19} height={9} color={INK.beak} />
        </Group>
        <Group transform={rightFoot}>
          <Oval x={52} y={86} width={19} height={9} color={INK.beak} />
        </Group>

        {/* Minik kanatlar (gövdenin arkasında) */}
        <Group transform={leftWing} origin={vec(26, 58)}>
          <Oval x={17} y={56} width={13} height={25} color={INK.featherDark} />
        </Group>
        <Group transform={rightWing} origin={vec(74, 58)}>
          <Oval x={70} y={56} width={13} height={25} color={INK.featherDark} />
        </Group>

        {/* Tombul gövde + büyük kafa: tek renk, tek siluet */}
        <Oval x={22} y={42} width={56} height={49} color={INK.feather} />
        <Circle cx={50} cy={37} r={30} color={INK.feather} />

        {/* Krem karın */}
        <Oval x={31} y={54} width={38} height={35} color={INK.cream} />

        <Face mood={mood} pose={pose} motion={motion} lookX={look.x} lookY={look.y} costume={costume} />

        {/* Örgü atkı: uç + bant, üstünde örgü çizgileri ve renk körlüğü sembolü */}
        <Path path={shapes.tail} color={scarf.dark}>
          {fancy && <LinearGradient start={vec(66, 64)} end={vec(66, 88)} colors={fancy.colors} positions={fancy.positions} />}
        </Path>
        <Group clip={shapes.tail} opacity={fancy ? 0 : 1}>
          {[70, 75, 80].map((ly) => (
            <Line key={ly} p1={vec(58, ly + 2)} p2={vec(76, ly - 1)} color={scarf.main} strokeWidth={1.6} />
          ))}
        </Group>
        <Path path={shapes.band} color={scarf.main}>
          {fancy && <LinearGradient start={vec(20, 62)} end={vec(80, 62)} colors={fancy.colors} positions={fancy.positions} />}
        </Path>
        <Group clip={shapes.band} opacity={fancy ? 0.18 : 0.5}>
          {[20, 27, 34, 41, 48, 55, 62, 69, 76].map((lx) => (
            <Line key={lx} p1={vec(lx, 78)} p2={vec(lx + 6, 52)} color={scarf.dark} strokeWidth={1.4} />
          ))}
        </Group>
        {symbol && (
          <>
            <Circle cx={36} cy={66.5} r={symbolR + 1.6} color={scarf.dark} />
            <SymbolMark kind={symbol} cx={36} cy={66.5} r={symbolR} />
          </>
        )}

        <Headwear motion={motion} lookX={look.x} lookY={look.y} costume={costume} scarf={scarf} />
      </Group>

      {pose === 'sleep' && <Zzz clock={clock} />}
      {mood === 'oops' && pose !== 'sleep' && <DizzyStars clock={clock} cx={50} cy={6} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Kayma: karnının üstünde, kanatlar geriye açık
// ---------------------------------------------------------------------------

/** Kayma pozunda gövde merkezi ve kafanın merkeze uzaklığı. */
const SLIDE_C = { x: 50, y: 56 };
const SLIDE_HEAD = 17;
const FACE_SCALE = 0.76;

function SlideBody({ direction, mood, motion, clock, scarf, costume }: BodyProps) {
  const heading = HEADING[direction];
  const dx = Math.cos(heading);
  const dy = Math.sin(heading);
  const head = { x: SLIDE_C.x + dx * SLIDE_HEAD, y: SLIDE_C.y + dy * SLIDE_HEAD };

  // Hafif titreme ve kanat çırpıntısı: hız hissi.
  const wobble = useDerivedValue(() => {
    const t = clock.value;
    return [{ translateX: -dy * Math.sin(t / 60) * 0.6 }, { translateY: dx * Math.sin(t / 60) * 0.6 }];
  });
  const wingUp = useDerivedValue(() => [{ rotate: -0.42 + Math.sin(clock.value / 70) * 0.07 }]);
  const wingDown = useDerivedValue(() => [{ rotate: 0.42 - Math.sin(clock.value / 70) * 0.07 }]);
  const scarfTail = useDerivedValue(() => [{ rotate: -0.25 + Math.sin(clock.value / 90) * 0.22 }]);

  const cy = SLIDE_C.y;
  const fancy = costume?.scarf ? SCARF_GRADIENTS[costume.scarf] : null;
  return (
    <Group transform={wobble}>
      {/* Gövde: sağa bakacak şekilde çizilir, sonra yöne döndürülür */}
      <Group transform={[{ rotate: heading }]} origin={vec(SLIDE_C.x, cy)}>
        {/* Gölge gövdeyle aynı merkezde: hangi yöne dönerse dönsün simetrik kalır */}
        <Oval x={10} y={cy - 24} width={84} height={48} color={SHADOW} opacity={0.1} />
        {/* Ayaklar arkada */}
        <Oval x={11} y={cy - 12} width={14} height={8} color={INK.beak} />
        <Oval x={11} y={cy + 4} width={14} height={8} color={INK.beak} />
        {/* Kanatlar geriye açık */}
        <Group transform={wingUp} origin={vec(50, cy - 15)}>
          <Oval x={24} y={cy - 26} width={30} height={12} color={INK.featherDark} />
        </Group>
        <Group transform={wingDown} origin={vec(50, cy + 15)}>
          <Oval x={24} y={cy + 14} width={30} height={12} color={INK.featherDark} />
        </Group>
        <Oval x={19} y={cy - 19} width={52} height={38} color={INK.feather} />
        {/* Atkı: boyunda bant, arkada dalgalanan uç */}
        <Group transform={scarfTail} origin={vec(42, cy - 15)}>
          <RoundedRect x={18} y={cy - 20} width={26} height={8} r={4} color={scarf.dark}>
            {fancy && <LinearGradient start={vec(18, cy)} end={vec(44, cy)} colors={fancy.colors} positions={fancy.positions} />}
          </RoundedRect>
        </Group>
        {/* Bant kafanın hemen arkasında: yarısı kafanın altında kalır */}
        <RoundedRect x={35} y={cy - 19} width={13} height={38} r={5} color={scarf.main}>
          {fancy && <LinearGradient start={vec(41, cy - 19)} end={vec(41, cy + 19)} colors={fancy.colors} positions={fancy.positions} />}
        </RoundedRect>
        <Circle cx={SLIDE_C.x + SLIDE_HEAD} cy={cy} r={23} color={INK.feather} />
      </Group>

      {/* Yüz dönmez: hangi yöne kayarsa kaysın dik ve okunur kalır */}
      <Group
        transform={[
          { translateX: head.x - 50 * FACE_SCALE },
          { translateY: head.y - 37 * FACE_SCALE },
          { scale: FACE_SCALE },
        ]}
      >
        <Face mood={mood} pose="slide" motion={motion} lookX={dx * 5} lookY={dy * 4} costume={costume} />
        {/* Şapka da yüz gibi dik kalır: kayarken de kafanın üstünde durur. */}
        <Headwear motion={motion} lookX={dx * 5} lookY={dy * 4} costume={costume} scarf={scarf} />
      </Group>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Saç ve şapka: kafayla birlikte döner
// ---------------------------------------------------------------------------

/**
 * Yüz bakış yönüne kaydığında saç ve şapkanın ne kadar peşinden gideceği.
 * 1'den küçük: tepedeki şey yüzdeki gözlükten daha az yer değiştirir; kafa
 * dönüyormuş gibi görünür ve şapka kafanın dışına taşmaz.
 */
const HEADWEAR_FOLLOW = { x: 0.6, y: 0.5 };

/**
 * Saç ve şapka. Yüzle aynı bakış kaymasını (yön + anlık bakınma) izler; yoksa
 * penguen kafasını çevirdiğinde yüz döner ama şapka yerinde kalırdı. Gözlük
 * zaten yüzün içinde çizildiği için yüzle birlikte kayar.
 */
function Headwear({
  motion,
  lookX,
  lookY,
  costume,
  scarf,
}: {
  motion: SharedValue<Motion>;
  lookX: number;
  lookY: number;
  costume?: Costume;
  scarf: BodyProps['scarf'];
}) {
  const transform = useDerivedValue(() => [
    { translateX: (lookX + motion.value.lookX) * HEADWEAR_FOLLOW.x },
    { translateY: (lookY + motion.value.lookY) * HEADWEAR_FOLLOW.y },
  ]);
  if (!costume?.hair && !costume?.hat) return null;
  return (
    <Group transform={transform}>
      <HairLayer hair={costume.hair} scarf={scarf} />
      <HatLayer hat={costume.hat} scarf={scarf} />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Küçük efektler
// ---------------------------------------------------------------------------

/** Uyurken yükselip kaybolan üç "z". */
function Zzz({ clock }: { clock: SharedValue<number> }) {
  const z = useMemo(
    () => Skia.PathBuilder.Make().moveTo(0, 0).lineTo(5, 0).lineTo(0, 5).lineTo(5, 5).detach(),
    [],
  );
  return (
    <>
      {[0, 1, 2].map((i) => (
        <FloatingZ key={i} clock={clock} path={z} index={i} />
      ))}
    </>
  );
}

function FloatingZ({
  clock,
  path,
  index,
}: {
  clock: SharedValue<number>;
  path: ReturnType<typeof symbolPath>;
  index: number;
}) {
  const phase = useDerivedValue(() => (clock.value / 2700 + index / 3) % 1);
  const transform = useDerivedValue(() => [
    { translateX: 68 + phase.value * 16 },
    { translateY: 24 - phase.value * 22 },
    { scale: 0.7 + phase.value * 0.9 },
  ]);
  const opacity = useDerivedValue(() => Math.sin(phase.value * Math.PI));
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={path} color="#7C93C9" style="stroke" strokeWidth={1.6} strokeCap="round" strokeJoin="round" />
    </Group>
  );
}

/** Çarpınca başın üstünde dönen küçük yıldızlar. */
function DizzyStars({ clock, cx, cy }: { clock: SharedValue<number>; cx: number; cy: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <OrbitStar key={i} clock={clock} cx={cx} cy={cy} index={i} />
      ))}
    </>
  );
}

function OrbitStar({
  clock,
  cx,
  cy,
  index,
}: {
  clock: SharedValue<number>;
  cx: number;
  cy: number;
  index: number;
}) {
  const transform = useDerivedValue(() => {
    const a = (clock.value / 900) * Math.PI * 2 + (index * Math.PI * 2) / 3;
    // Yatık elips yörünge; arkadaki yıldız biraz küçülür.
    return [
      { translateX: cx + Math.cos(a) * 20 },
      { translateY: cy + Math.sin(a) * 5 },
      { scale: 3.4 + Math.sin(a) * 0.9 },
    ];
  });
  return (
    <Group transform={transform}>
      <Path path={symbolPath('star')} color="#FFC93C" />
    </Group>
  );
}
