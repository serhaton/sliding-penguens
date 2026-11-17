/**
 * Dünya haritasının geometrisi (saf fonksiyonlar): Antarktika kıtasının kıyı
 * çizgisi ve bölüm düğümlerinin kıta üstündeki konumu.
 *
 * Yol kıtanın güney kıyısından başlar ve satır satır, yılan gibi kıvrılarak
 * kuzeye tırmanır. Her episode kıtada yatay bir kuşak kaplar ve yeni bir satırda
 * başlar; böylece episode'lar haritada ayrı bölgeler olarak görünür.
 *
 * Düğüm sayısı ya da kıta boyutu değişirse satır aralığı kendiliğinden ayarlanır:
 * yeni episode eklemek için burada bir şey değiştirmek gerekmez.
 */

export interface MapPoint {
  x: number;
  y: number;
}

/**
 * Antarktika'nın sadeleştirilmiş kıyı çizgisi (0–100 birimlik kare içinde, saat
 * yönünde). Sol üstte Antarktika Yarımadası, onun sağında Weddell Denizi
 * girintisi, altta Ross Denizi girintisi, sağda Amery buz sahanlığı çentiği.
 */
export const ANTARCTICA: readonly MapPoint[] = [
  [14, 8], [19, 12], [23, 19], [27, 26], [33, 31], [38, 30], [42, 24], [48, 18],
  [56, 13], [65, 10], [74, 11], [82, 15], [89, 22], [94, 31], [93, 38], [89, 41],
  [93, 45], [97, 54], [96, 64], [92, 73], [86, 81], [78, 87], [69, 91], [60, 92],
  [53, 89], [49, 82], [45, 76], [40, 78], [37, 84], [31, 86], [24, 82], [18, 75],
  [13, 67], [10, 58], [12, 50], [9, 44], [8, 38], [12, 33], [16, 28], [15, 21],
  [11, 14],
].map(([x, y]) => ({ x: x!, y: y! }));

/** Kıyı çizgisi, kenarı `size` olan kareye ölçeklenmiş. */
export function coastline(size: number): MapPoint[] {
  return ANTARCTICA.map((p) => ({ x: (p.x / 100) * size, y: (p.y / 100) * size }));
}

/** Nokta çokgenin içinde mi? (ışın atma yöntemi) */
export function insidePolygon(point: MapPoint, polygon: readonly MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** `y` yüksekliğindeki yatay çizginin kıtanın içinde kalan en geniş parçası. */
function widestSpan(polygon: readonly MapPoint[], y: number): [number, number] | null {
  const xs: number[] = [];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  }
  xs.sort((p, q) => p - q);
  let best: [number, number] | null = null;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const span: [number, number] = [xs[i]!, xs[i + 1]!];
    if (!best || span[1] - span[0] > best[1] - best[0]) best = span;
  }
  return best;
}

export interface MapLayout {
  /** Kıtanın kenar uzunluğu. */
  size: number;
  /** Düğüm merkezleri: bütün episode'ların bölümleri art arda. */
  nodes: MapPoint[];
  /** `episodeOf[i]`: i. düğümün episode'u (0'dan başlar). */
  episodeOf: number[];
  /** `trail[i]`: i. düğümden (i+1). düğüme giden ayak izleri. */
  trail: MapPoint[][];
  /** Her episode'un kıtadaki yatay kuşağı ve düğümlerinin orta noktası. */
  episodes: { top: number; bottom: number; center: MapPoint }[];
}

/** Aynı satırdaki iki düğüm arasındaki en az mesafe. */
const NODE_SPACING = 116;
/** Düğümlerin kıyıdan uzaklığı. */
const COAST_MARGIN = 52;
/** Denenen satır aralıkları: sığan en ferah olan seçilir. */
const ROW_STEP_MAX = 160;
const ROW_STEP_MIN = 80;
/** Satırlar dümdüz olmasın: hafif dalga. */
const WAVE = 20;
/** İki düğüm arasındaki ayak izi sayısı. */
const DOTS = 2;

function tryLayout(counts: readonly number[], size: number, rowStep: number): MapLayout | null {
  const coast = coastline(size);
  const minY = Math.min(...coast.map((p) => p.y));
  const maxY = Math.max(...coast.map((p) => p.y));

  const nodes: MapPoint[] = [];
  const episodeOf: number[] = [];
  const rowsOf: number[][] = counts.map(() => []);
  let episode = 0;
  let left = counts[0] ?? 0;
  /** Yılan: her satırda yön değişir. */
  let rightward = false;

  for (let y = maxY - COAST_MARGIN; y >= minY + COAST_MARGIN && episode < counts.length; y -= rowStep) {
    const span = widestSpan(coast, y);
    if (!span) continue;
    const from = span[0] + COAST_MARGIN;
    const to = span[1] - COAST_MARGIN;
    if (to - from < NODE_SPACING) continue;

    const capacity = Math.floor((to - from) / NODE_SPACING) + 1;
    const gap = (to - from) / (capacity - 1);
    const take = Math.min(capacity, left);
    for (let k = 0; k < take; k++) {
      const x = rightward ? from + k * gap : to - k * gap;
      nodes.push({ x, y: y + Math.sin((x / size) * Math.PI * 3) * WAVE });
      episodeOf.push(episode);
    }
    rowsOf[episode]!.push(y);
    rightward = !rightward;
    left -= take;
    // Episode bitti: sıradaki episode yeni satırda başlar.
    if (left === 0) {
      episode += 1;
      left = counts[episode] ?? 0;
    }
  }
  if (episode < counts.length) return null;

  const trail: MapPoint[][] = [];
  for (let i = 0; i + 1 < nodes.length; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    trail.push(
      Array.from({ length: DOTS }, (_, d) => {
        const t = (d + 1) / (DOTS + 1);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }),
    );
  }

  // Kuşak sınırı: iki episode'un komşu satırlarının tam ortası.
  const episodes = counts.map((_, w) => {
    const rows = rowsOf[w]!;
    const below = rowsOf[w - 1];
    const above = rowsOf[w + 1];
    const mine = nodes.filter((__, i) => episodeOf[i] === w);
    return {
      bottom: below ? (rows[0]! + below[below.length - 1]!) / 2 : size,
      top: above ? (rows[rows.length - 1]! + above[0]!) / 2 : 0,
      center: {
        x: mine.reduce((sum, p) => sum + p.x, 0) / mine.length,
        y: mine.reduce((sum, p) => sum + p.y, 0) / mine.length,
      },
    };
  });

  return { size, nodes, episodeOf, trail, episodes };
}

/**
 * Düğümleri kıtaya yerleştirir. `counts`: her episode'daki bölüm sayısı.
 * Kıta bu kadar düğümü alamayacak kadar küçükse hata fırlatır (bkz. testler).
 */
export function mapLayout(counts: readonly number[], size: number): MapLayout {
  for (let rowStep = ROW_STEP_MAX; rowStep >= ROW_STEP_MIN; rowStep -= 4) {
    const layout = tryLayout(counts, size, rowStep);
    if (layout) return layout;
  }
  throw new Error(`Harita ${counts.join('+')} düğümü ${size} pt kıtaya sığdıramıyor`);
}

/**
 * Haritanın ekrandaki yerleşimi: içerik önce `scale` kadar ölçeklenir, sonra
 * (x, y) kadar ötelenir. Yani ekran = öteleme + ölçek × içerik.
 */
export interface MapCamera {
  x: number;
  y: number;
  scale: number;
}

/**
 * Tek eksende ötelemeyi sınırlar: içerik pencereden küçükse ortalanır, büyükse
 * kenarları pencerenin içine girmez (boşluk görünmez). UI iş parçacığında da çalışır.
 */
export function clampAxis(value: number, scaledContent: number, viewport: number): number {
  'worklet';
  if (scaledContent <= viewport) return (viewport - scaledContent) / 2;
  return Math.min(0, Math.max(viewport - scaledContent, value));
}

/**
 * Uzak görünümün ölçeği (en fazla 1). `inset`: içeriğin kenarındaki, görünmesi
 * gerekmeyen pay (haritada kıtayı saran okyanus); sığdırılan şey ortadaki kısımdır.
 */
export function fitScale(content: number, viewport: { width: number; height: number }, inset = 0): number {
  const region = content - inset * 2;
  return Math.min(1, viewport.width / region, viewport.height / region);
}

/** İçeriğin ortadaki kısmını pencereye sığdırıp ortalayan kamera (uzak görünüm). */
export function overviewCamera(
  content: number,
  viewport: { width: number; height: number },
  inset = 0,
): MapCamera {
  const scale = fitScale(content, viewport, inset);
  return {
    scale,
    x: clampAxis(viewport.width / 2 - (content / 2) * scale, content * scale, viewport.width),
    y: clampAxis(viewport.height / 2 - (content / 2) * scale, content * scale, viewport.height),
  };
}

/** Bir noktayı (içerik koordinatlarında) pencerenin ortasına getiren kamera. */
export function focusCamera(
  point: MapPoint,
  content: number,
  viewport: { width: number; height: number },
  scale = 1,
): MapCamera {
  return {
    scale,
    x: clampAxis(viewport.width / 2 - point.x * scale, content * scale, viewport.width),
    y: clampAxis(viewport.height / 2 - point.y * scale, content * scale, viewport.height),
  };
}
