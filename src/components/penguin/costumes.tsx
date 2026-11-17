/**
 * Kostüm çizimleri: şapkalar, saçlar, gözlükler ve özel atkıların renkleri.
 *
 * Hepsi kafa koordinatlarında çizilir (kafa merkezi 50,37; yarıçap 30), bu
 * yüzden ayakta ve kayma pozları aynı çizimi kullanır. Yeni bir kostüm eklemek
 * için: türünü types.ts'e, çizimini buraya, ürününü data/cosmetics.ts'e ekle.
 */
import { Circle, Group, Line, Oval, Path, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia';

import { INK } from './palette';
import type { Glasses, Hair, Hat, ScarfStyle } from './types';

export interface ScarfTone {
  main: string;
  dark: string;
  light: string;
}

const path = () => Skia.PathBuilder.Make();

// ---------------------------------------------------------------------------
// Özel atkılar: renk geçişleri (bant boyunca soldan sağa)
// ---------------------------------------------------------------------------

export const SCARF_GRADIENTS: Record<ScarfStyle, { colors: string[]; positions?: number[] }> = {
  // Gökkuşağı: yedi renk, yumuşak geçiş.
  rainbow: { colors: ['#FF5C7A', '#FF9A3D', '#FFD23C', '#3DCB7E', '#3DA5FF', '#7A5CFF', '#D65CFF'] },
  // Şeker kamışı: kırmızı-beyaz keskin çizgiler.
  candy: {
    colors: ['#FF4D6A', '#FF4D6A', '#FFFFFF', '#FFFFFF', '#FF4D6A', '#FF4D6A', '#FFFFFF', '#FFFFFF', '#FF4D6A', '#FF4D6A'],
    positions: [0, 0.2, 0.2, 0.4, 0.4, 0.6, 0.6, 0.8, 0.8, 1],
  },
  // Altın: ışıltılı sarı.
  gold: { colors: ['#E0A21C', '#FFE28A', '#FFC93C', '#FFF1B8', '#E0A21C'] },
  // Kutup ışığı: yeşilden mora.
  aurora: { colors: ['#2EE6A6', '#3DC8FF', '#7A6BFF', '#D46BFF'] },
};

// ---------------------------------------------------------------------------
// Saçlar
// ---------------------------------------------------------------------------

const HAIR = {
  tuft: path()
    .moveTo(43, 10).quadTo(40, -5, 50, -7).quadTo(46, 1, 51, 9)
    .lineTo(51, 9).quadTo(54, -3, 63, -2).quadTo(57, 3, 58, 10).close().detach(),
  spiky: path()
    .moveTo(26, 18).lineTo(29, 1).lineTo(37, 10).lineTo(42, -6).lineTo(50, 7)
    .lineTo(58, -6).lineTo(63, 10).lineTo(71, 1).lineTo(74, 18).close().detach(),
  mohawk: path()
    .moveTo(42, 13).lineTo(40, -3).lineTo(45, 2).lineTo(48, -11).lineTo(52, -1)
    .lineTo(55, -10).lineTo(57, 2).lineTo(61, -2).lineTo(58, 13).close().detach(),
  pompadour: path()
    .moveTo(25, 20).cubicTo(22, -8, 62, -14, 76, 6).cubicTo(66, 1, 52, 8, 46, 20).close().detach(),
  pompadourShine: path().moveTo(32, 8).quadTo(46, -4, 62, 0).detach(),
};

export function HairLayer({ hair, scarf }: { hair: Hair | undefined; scarf: ScarfTone }) {
  switch (hair) {
    // Perçem: tepede iki minik tüy.
    case 'tuft':
      return <Path path={HAIR.tuft} color={INK.feather} />;
    // Dikenli saç.
    case 'spiky':
      return <Path path={HAIR.spiky} color={INK.featherDark} />;
    // Mohavk: atkı renginde ibik.
    case 'mohawk':
      return (
        <>
          <Path path={HAIR.mohawk} color={scarf.main} />
          <Line p1={vec(48, 10)} p2={vec(48, -4)} color={scarf.light} strokeWidth={1.6} strokeCap="round" opacity={0.7} />
        </>
      );
    // Kıvırcık: kabarık bulut.
    case 'curls':
      return (
        <>
          {[
            [27, 20, 8.5], [73, 20, 8.5], [36, 10, 10.5], [64, 10, 10.5], [50, 5, 12.5],
          ].map(([cx, cy, r]) => (
            <Circle key={`${cx}`} cx={cx!} cy={cy!} r={r!} color={INK.featherDark} />
          ))}
          {[[42, 3], [58, 6], [33, 13]].map(([cx, cy]) => (
            <Circle key={`h${cx}`} cx={cx!} cy={cy!} r={2.2} color={INK.feather} />
          ))}
        </>
      );
    // İki yandan topuz, atkı renginde tokalarla.
    case 'pigtails':
      return (
        <>
          <Circle cx={15} cy={40} r={9.5} color={INK.featherDark} />
          <Circle cx={85} cy={40} r={9.5} color={INK.featherDark} />
          <Circle cx={22.5} cy={36} r={3.4} color={scarf.main} />
          <Circle cx={77.5} cy={36} r={3.4} color={scarf.main} />
        </>
      );
    // Kabarık ön saç.
    case 'pompadour':
      return (
        <>
          <Path path={HAIR.pompadour} color={INK.featherDark} />
          <Path path={HAIR.pompadourShine} color={INK.feather} style="stroke" strokeWidth={2.2} strokeCap="round" />
        </>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Şapkalar
// ---------------------------------------------------------------------------

const HAT = {
  beanie: path().moveTo(21, 27).cubicTo(22, -3, 78, -3, 79, 27).close().detach(),
  cap: path().moveTo(20, 25).cubicTo(22, 0, 78, 0, 80, 25).close().detach(),
  crown: path()
    .moveTo(31, 16).lineTo(28, -5).lineTo(40, 5).lineTo(50, -10).lineTo(60, 5).lineTo(72, -5).lineTo(69, 16)
    .close().detach(),
  party: path().moveTo(35, 11).lineTo(50, -24).lineTo(65, 11).close().detach(),
  wizard: path().moveTo(28, 13).lineTo(46, -29).quadTo(56, -27, 60, -18).lineTo(72, 13).close().detach(),
  viking: path().moveTo(22, 24).cubicTo(24, 0, 76, 0, 78, 24).close().detach(),
  hornLeft: path().moveTo(26, 19).quadTo(9, 13, 11, -5).quadTo(19, 6, 32, 10).close().detach(),
  hornRight: path().moveTo(74, 19).quadTo(91, 13, 89, -5).quadTo(81, 6, 68, 10).close().detach(),
  flowerBand: path().moveTo(23, 24).cubicTo(30, 1, 70, 1, 77, 24).detach(),
  headband: path().moveTo(19, 36).cubicTo(19, -6, 81, -6, 81, 36).detach(),
  explorer: path().moveTo(20, 26).cubicTo(21, -4, 79, -4, 80, 26).close().detach(),
};

const FLOWERS = [
  [27, 18, '#FF7FA6'], [37, 9, '#FFFFFF'], [50, 5.5, '#FFD23C'], [63, 9, '#FFFFFF'], [73, 18, '#FF7FA6'],
] as const;

export function HatLayer({ hat, scarf }: { hat: Hat | undefined; scarf: ScarfTone }) {
  switch (hat) {
    case 'beanie':
      return (
        <>
          <Circle cx={50} cy={3} r={6.5} color={scarf.light} />
          <Path path={HAT.beanie} color={scarf.main} />
          <RoundedRect x={19} y={20} width={62} height={9} r={4.5} color={scarf.dark} />
        </>
      );
    case 'cap':
      return (
        <>
          <Path path={HAT.cap} color={scarf.main} />
          <RoundedRect x={56} y={19} width={36} height={7} r={3.5} color={scarf.dark} />
          <Circle cx={50} cy={5.5} r={2.6} color={scarf.dark} />
        </>
      );
    // Parti şapkası: benekli külah, tepesinde ponpon.
    case 'party':
      return (
        <>
          <Path path={HAT.party} color={scarf.main} />
          <Group clip={HAT.party}>
            {[[44, 2], [55, -4], [50, -13], [41, 9], [59, 8]].map(([cx, cy]) => (
              <Circle key={`${cx}`} cx={cx!} cy={cy!} r={2.4} color="#FFFFFF" opacity={0.85} />
            ))}
          </Group>
          <RoundedRect x={33} y={8} width={34} height={6} r={3} color={scarf.dark} />
          <Circle cx={50} cy={-24} r={5} color="#FFD23C" />
        </>
      );
    // Çiçek tacı.
    case 'flowers':
      return (
        <>
          <Path path={HAT.flowerBand} color="#3DBB6E" style="stroke" strokeWidth={3.4} strokeCap="round" />
          {FLOWERS.map(([cx, cy, color]) => (
            <Group key={cx}>
              <Circle cx={cx} cy={cy} r={5.6} color={color} />
              <Circle cx={cx} cy={cy} r={2.3} color={color === '#FFD23C' ? '#FF9A3D' : '#FFD23C'} />
            </Group>
          ))}
        </>
      );
    // Kulaklık: atkı renginde kulak yastıkları.
    case 'headphones':
      return (
        <>
          <Path path={HAT.headband} color={INK.eye} style="stroke" strokeWidth={5} strokeCap="round" />
          <RoundedRect x={11} y={27} width={13} height={21} r={6} color={scarf.main} />
          <RoundedRect x={76} y={27} width={13} height={21} r={6} color={scarf.main} />
          <RoundedRect x={11} y={31} width={5} height={13} r={2.5} color={scarf.dark} />
          <RoundedRect x={84} y={31} width={5} height={13} r={2.5} color={scarf.dark} />
        </>
      );
    case 'tophat':
      return (
        <>
          <RoundedRect x={31} y={-16} width={38} height={30} r={5} color={INK.eye} />
          <Rect x={31} y={3} width={38} height={6} color={scarf.main} />
          <RoundedRect x={20} y={9} width={60} height={7} r={3.5} color={INK.eye} />
        </>
      );
    // Viking miğferi: boynuzlu.
    case 'viking':
      return (
        <>
          <Path path={HAT.hornLeft} color={INK.cream} />
          <Path path={HAT.hornRight} color={INK.cream} />
          <Path path={HAT.viking} color="#9AA7B8" />
          <RoundedRect x={20} y={19} width={60} height={8} r={3.5} color="#6F7C90" />
          {[30, 50, 70].map((cx) => (
            <Circle key={cx} cx={cx} cy={23} r={1.8} color="#D5DCE6" />
          ))}
        </>
      );
    // Büyücü külahı: yıldızlı, ucu kıvrık.
    case 'wizard':
      return (
        <>
          <Path path={HAT.wizard} color="#6B4BD8" />
          <Circle cx={47} cy={-4} r={3.4} color="#FFD23C" />
          <Circle cx={57} cy={5} r={2} color="#FFD23C" />
          <Circle cx={40} cy={6} r={1.6} color="#FFD23C" />
          <Oval x={13} y={8} width={74} height={13} color="#5236B5" />
        </>
      );
    case 'crown':
      return (
        <>
          <Path path={HAT.crown} color="#FFC93C" />
          <RoundedRect x={29} y={11} width={42} height={7} r={3} color="#F0A81C" />
          <Circle cx={50} cy={14.5} r={2.6} color="#FF5C7A" />
          <Circle cx={38} cy={14.5} r={1.8} color="#4C9BFF" />
          <Circle cx={62} cy={14.5} r={1.8} color="#4C9BFF" />
        </>
      );
    // Kâşif kalpağı: kürklü, kulaklıklı (başlangıç paketine özel).
    case 'explorer':
      return (
        <>
          <RoundedRect x={12} y={22} width={14} height={26} r={7} color="#8B4A12" />
          <RoundedRect x={74} y={22} width={14} height={26} r={7} color="#8B4A12" />
          <Path path={HAT.explorer} color="#B5651D" />
          <RoundedRect x={17} y={17} width={66} height={12} r={6} color={INK.cream} />
          <Circle cx={50} cy={1} r={4.5} color={INK.cream} />
        </>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Gözlükler (yüzün üstünde; göz merkezleri x=38.5 ve 61.5, y=40)
// ---------------------------------------------------------------------------

const EYE_Y = 40;
const EYES = [38.5, 61.5] as const;

const heart = (cx: number) =>
  path()
    .moveTo(cx, EYE_Y + 10)
    .cubicTo(cx - 16, EYE_Y - 1, cx - 9, EYE_Y - 13, cx, EYE_Y - 5)
    .cubicTo(cx + 9, EYE_Y - 13, cx + 16, EYE_Y - 1, cx, EYE_Y + 10)
    .close().detach();
const HEARTS = EYES.map(heart);

export function GlassesLayer({ glasses }: { glasses: Glasses | undefined }) {
  switch (glasses) {
    case 'round':
      return (
        <>
          {EYES.map((cx) => (
            <Circle key={cx} cx={cx} cy={EYE_Y} r={10} color={INK.eye} style="stroke" strokeWidth={1.8} />
          ))}
          <Line p1={vec(48.5, EYE_Y - 1)} p2={vec(51.5, EYE_Y - 1)} color={INK.eye} strokeWidth={1.8} strokeCap="round" />
        </>
      );
    // Güneş gözlüğü: gözleri örten koyu camlar, üstünde ince parıltı.
    case 'shades':
      return (
        <>
          {EYES.map((cx) => (
            <RoundedRect key={cx} x={cx - 10.5} y={EYE_Y - 7} width={21} height={14} r={5.5} color={INK.eye} />
          ))}
          <Line p1={vec(46, EYE_Y - 3)} p2={vec(54, EYE_Y - 3)} color={INK.eye} strokeWidth={2.4} strokeCap="round" />
          {EYES.map((cx) => (
            <Line
              key={`g${cx}`}
              p1={vec(cx - 6, EYE_Y - 1)}
              p2={vec(cx - 2, EYE_Y - 4)}
              color={INK.white}
              strokeWidth={1.4}
              strokeCap="round"
              opacity={0.55}
            />
          ))}
        </>
      );
    // Kalp gözlük: pembe, yarı saydam camlar.
    case 'hearts':
      return (
        <>
          {HEARTS.map((p, i) => (
            <Group key={i}>
              <Path path={p} color="#FF7FA6" opacity={0.45} />
              <Path path={p} color="#FF4D7E" style="stroke" strokeWidth={1.8} strokeJoin="round" />
            </Group>
          ))}
          <Line p1={vec(48, EYE_Y - 2)} p2={vec(52, EYE_Y - 2)} color="#FF4D7E" strokeWidth={1.8} strokeCap="round" />
        </>
      );
    // Monokl: tek gözde altın çerçeve, zincirli.
    case 'monocle':
      return (
        <>
          <Circle cx={EYES[1]} cy={EYE_Y} r={10.5} color="#E0A21C" style="stroke" strokeWidth={2.2} />
          <Line p1={vec(EYES[1] + 8, EYE_Y + 7)} p2={vec(EYES[1] + 11, EYE_Y + 24)} color="#E0A21C" strokeWidth={1.2} strokeCap="round" />
        </>
      );
    // Kayak gözlüğü: geniş tek cam.
    case 'goggles':
      return (
        <>
          <Rect x={15} y={EYE_Y - 4} width={70} height={7} color={INK.eye} />
          <RoundedRect x={25} y={EYE_Y - 10} width={50} height={20} r={9} color="#FF8A3D" />
          <RoundedRect x={28} y={EYE_Y - 7.5} width={44} height={15} r={7} color="#8FD3FF" opacity={0.3} />
          <Line p1={vec(33, EYE_Y - 1)} p2={vec(39, EYE_Y - 5)} color={INK.white} strokeWidth={1.6} strokeCap="round" opacity={0.8} />
        </>
      );
    default:
      return null;
  }
}
