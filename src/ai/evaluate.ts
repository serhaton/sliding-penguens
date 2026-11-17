/**
 * Düello değerlendirme fonksiyonu: bir durum, verilen takım için ne kadar iyi?
 *
 *   puan = (rakibin yuvaya uzaklığı − benim uzaklığım)
 *        + yuvadaki penguen farkı × HOME_WEIGHT
 *
 * "Uzaklık" tahmindir: bir penguenin yuvasına girmesi kaç hamle ister?
 *  - Sabit yön kuralında penguenin tek hamlesi vardır (baktığı yöne kaymak):
 *    ya o kaymayla yuvaya girer ya da kendi başına giremez (`soloDistance`).
 *  - "Çarpınca dön" kuralında penguen dolaşabilir, ama çoğu zaman yuvanın
 *    hizasında durabilmek için bir takım arkadaşının önüne park etmesi gerekir.
 *    `relaxedDistance` bunu hesaba katar: penguen kayarken yolunun ortasında da
 *    durabilir sayılır, ama bu duruş bir hamle fazla tutar (o hamle, önüne
 *    park eden arkadaşındır). Böylece puan, kimsenin tek başına yuvaya
 *    varamadığı durumlarda da doğru yöne çeker. Takımın tahtadaki son pengueni
 *    için park yoktur (arkadaşı kalmamıştır): yalnızca doğal engellerde durur.
 *
 * Rakibi bloklamanın değeri ayrıca hesaplanmaz, kendiliğinden çıkar: benim
 * penguenim rakibin yolunda durunca rakibin yolu uzar ve puanım artar.
 */
import {
  CLOCKWISE,
  computeSlide,
  DIR_VECTORS,
  DIRECTIONS,
  type GameState,
  type Penguin,
  type TeamId,
} from '@/engine';

/** Zincir bu kadar dokunuşta yuvaya varmazsa "uzak" sayılır. */
export const MAX_CHAIN = 8;
/** Yuvaya varamayan (ya da çok uzak olan) penguenin uzaklığı. */
export const FAR = 14;
/** Yuvadaki her penguen farkının değeri (uzaklık birimiyle). */
export const HOME_WEIGHT = 4;
/** Kesin sonuçların puanı; erken galibiyet geç galibiyetten iyidir (bkz. search.ts). */
export const WIN = 1000;

/**
 * Penguen, diğerleri kıpırdamadan kaç dokunuşta yuvasına girer?
 * Yuvadaysa 0; giremiyorsa `FAR`.
 */
export function soloDistance(state: GameState, penguin: Penguin): number {
  if (penguin.status === 'home') return 0;
  // Uyuyan penguen kendi başına hiçbir yere gidemez.
  if (penguin.status !== 'active') return FAR;

  const turns = state.rules.turnOnBump;
  let current = penguin;
  /** Aynı (konum, yön) ikinci kez görülürse zincir döngüye girmiştir. */
  const seen = new Set<string>();

  for (let taps = 1; taps <= MAX_CHAIN; taps++) {
    const key = `${current.x},${current.y},${current.dir}`;
    if (seen.has(key)) return FAR;
    seen.add(key);

    // Zincir boyunca penguen "hayalî" konumunda değerlendirilir: tahtadaki
    // kendisi engel sayılmasın diye durumdan çıkarılır.
    const probe: GameState = {
      ...state,
      penguins: state.penguins.map((p) => (p.id === penguin.id ? current : p)),
    };
    const slide = computeSlide(probe, current);
    if (slide.enteredIglooId) return taps;

    const end = slide.path[slide.path.length - 1];
    // Sabit yön kuralında önü kapalı penguen artık ilerleyemez.
    if (!turns && !end) return FAR;
    current = {
      ...current,
      x: end?.x ?? current.x,
      y: end?.y ?? current.y,
      dir: turns ? CLOCKWISE[current.dir] : current.dir,
    };
    if (!turns) return FAR; // Sabit yönde durduktan sonra aynı yöne yine kayamaz.
  }
  return FAR;
}

/** Yolun ortasında durmanın ek bedeli: önüne park eden arkadaşın hamlesi. */
const PARK_COST = 1;

/**
 * "Çarpınca dön" kuralında gevşetilmiş uzaklık (bkz. dosya başı). En kısa yol
 * araması: düğüm = (hücre, yön); kayıp doğal engelde durmak 1, yolun ortasında
 * durmak 1 + PARK_COST hamle. Yuvaya giremiyorsa `FAR`.
 */
export function relaxedDistance(state: GameState, penguin: Penguin): number {
  if (penguin.status === 'home') return 0;
  if (penguin.status !== 'active') return FAR;

  // Yolun ortasında durabilmek için önüne park edecek bir takım arkadaşı gerekir.
  // Takımın tahtadaki son pengueni yalnızca doğal engellerde durabilir; bu
  // yüzden yapay zekâ, tek başına yuvaya varamayacak pengueni sona bırakmaz.
  const canPark = state.penguins.some(
    (p) => p.team === penguin.team && p.id !== penguin.id && p.status === 'active',
  );

  const { width, height } = state;
  // Hücre haritası: 0 boş, 1 engel, 2 bu penguenin girebileceği igloo.
  const map = new Uint8Array(width * height);
  state.cells.forEach((cell, i) => {
    if (cell === 'rock' || cell === 'water') map[i] = 1;
  });
  for (const other of state.penguins) {
    if (other.id !== penguin.id && other.status !== 'home') map[other.y * width + other.x] = 1;
  }
  for (const igloo of state.igloos) {
    const full = igloo.capacity !== null && igloo.occupants >= igloo.capacity;
    const mine = state.rules.iglooMatch === 'color' ? igloo.color === penguin.color : igloo.team === penguin.team;
    map[igloo.y * width + igloo.x] = mine && !full ? 2 : 1;
  }

  const node = (x: number, y: number, d: number) => (y * width + x) * 4 + d;
  const best = new Uint8Array(width * height * 4).fill(255);
  // Bedeller küçük tam sayılar: bedele göre kovalar, sırayla boşaltılır.
  const buckets: number[][] = Array.from({ length: FAR + 2 }, () => []);
  const push = (x: number, y: number, d: number, cost: number) => {
    if (cost >= FAR) return;
    const n = node(x, y, d);
    if (cost < best[n]!) {
      best[n] = cost;
      buckets[cost]!.push(n);
    }
  };
  push(penguin.x, penguin.y, DIRECTIONS.indexOf(penguin.dir), 0);

  for (let cost = 0; cost < FAR; cost++) {
    for (const n of buckets[cost]!) {
      if (best[n] !== cost) continue;
      const d = n % 4;
      const cell = (n - d) / 4;
      const step = DIR_VECTORS[DIRECTIONS[d]!];
      const turned = (d + 1) % 4; // DIRECTIONS saat yönünde sıralıdır.
      let x = cell % width;
      let y = (cell - x) / width;
      for (;;) {
        const nx = x + step.x;
        const ny = y + step.y;
        const ahead = nx < 0 || ny < 0 || nx >= width || ny >= height ? 1 : map[ny * width + nx]!;
        // Kovalar bedel sırasıyla boşaldığı için ilk varış en kısasıdır.
        if (ahead === 2) return cost + 1;
        if (ahead === 1) {
          // Doğal engel: burada durur (hiç kıpırdamadıysa yerinde döner).
          push(x, y, turned, cost + 1);
          break;
        }
        x = nx;
        y = ny;
        // Yolun ortasında durmak: bir arkadaşın önüne park etmesi gerekir.
        if (canPark) push(x, y, turned, cost + 1 + PARK_COST);
      }
    }
  }
  return FAR;
}

/** Kurala göre uygun uzaklık tahmini. */
export function distanceHome(state: GameState, penguin: Penguin): number {
  return state.rules.turnOnBump ? relaxedDistance(state, penguin) : soloDistance(state, penguin);
}

/** Bir takımın toplam uzaklığı (küçük olan iyi). */
export function teamDistance(state: GameState, team: TeamId): number {
  let total = 0;
  for (const p of state.penguins) if (p.team === team) total += distanceHome(state, p);
  return total;
}

/**
 * Durumun `team` açısından puanı. Oyun bittiyse kesin sonuç: galibiyet +WIN,
 * yenilgi −WIN, beraberlik 0.
 */
export function evaluate(state: GameState, team: TeamId): number {
  if (state.result) {
    if (state.result.winner === null) return 0;
    return state.result.winner === team ? WIN : -WIN;
  }
  let score = 0;
  for (const p of state.penguins) {
    const mine = p.team === team;
    const distance = distanceHome(state, p);
    score += mine ? -distance : distance;
    if (p.status === 'home') score += mine ? HOME_WEIGHT : -HOME_WEIGHT;
  }
  return score;
}
