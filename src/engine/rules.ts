/**
 * Kayma kuralları — durumu değiştirmeyen saf sorgular.
 * `applyMove`, çözücü, yapay zekâ ve arayüz (ipucu oku, "hayır" animasyonu)
 * hepsi buradaki `computeSlide` üzerinden aynı kuralı okur.
 */
import { DIR_VECTORS, cellIndex, inBounds } from './grid';
import type { GameState, Igloo, Move, Obstacle, Penguin, TeamId, Vec } from './types';

export interface SlideResult {
  /** Penguenin sırayla girdiği hücreler (igloya girdiyse sonuncusu igloo hücresi). */
  readonly path: readonly Vec[];
  /** Çarpıp durduğu engel; igloya girdiyse null. */
  readonly obstacle: Obstacle | null;
  /** Girdiği igloo; girmediyse null. */
  readonly enteredIglooId: string | null;
}

/** Penguen bu igloya girebilir mi? */
export function canEnterIgloo(state: GameState, penguin: Penguin, igloo: Igloo): boolean {
  if (igloo.capacity !== null && igloo.occupants >= igloo.capacity) return false;
  return state.rules.iglooMatch === 'color'
    ? igloo.color === penguin.color
    : igloo.team === penguin.team;
}

/**
 * Penguen dokunulsa ne olurdu? Baktığı yönde hücre hücre ilerler:
 * - tahta kenarı, kaya, su, tahtadaki başka bir penguen (uyuyan dahil) ya da
 *   giremeyeceği bir igloo → hemen önündeki hücrede durur;
 * - kendi igloosu → içeri girer.
 * `path` boşsa penguen hiç kıpırdayamıyor demektir.
 */
export function computeSlide(state: GameState, penguin: Penguin): SlideResult {
  const step = DIR_VECTORS[penguin.dir];
  const path: Vec[] = [];
  let x = penguin.x;
  let y = penguin.y;

  for (;;) {
    const nx = x + step.x;
    const ny = y + step.y;

    if (!inBounds(state, nx, ny)) return { path, obstacle: { kind: 'wall' }, enteredIglooId: null };

    const cell = state.cells[cellIndex(state, nx, ny)];
    if (cell === 'rock' || cell === 'water') {
      return { path, obstacle: { kind: cell }, enteredIglooId: null };
    }

    const other = state.penguins.find((p) => p.status !== 'home' && p.x === nx && p.y === ny);
    if (other) {
      return { path, obstacle: { kind: 'penguin', penguinId: other.id }, enteredIglooId: null };
    }

    const igloo = state.igloos.find((g) => g.x === nx && g.y === ny);
    if (igloo) {
      if (canEnterIgloo(state, penguin, igloo)) {
        path.push({ x: nx, y: ny });
        return { path, obstacle: null, enteredIglooId: igloo.id };
      }
      return { path, obstacle: { kind: 'igloo', iglooId: igloo.id }, enteredIglooId: null };
    }

    path.push({ x: nx, y: ny });
    x = nx;
    y = ny;
  }
}

/** Penguen şu an kayabilir mi (sıra ve oyun sonu hesaba katılmadan)? */
export function canSlide(state: GameState, penguin: Penguin): boolean {
  return penguin.status === 'active' && computeSlide(state, penguin).path.length > 0;
}

/**
 * Penguene dokunmak geçerli bir hamle mi? "Çarpınca dön" kuralında önü kapalı
 * penguen de oynanabilir: yerinde döner.
 */
export function canAct(state: GameState, penguin: Penguin): boolean {
  if (penguin.status !== 'active') return false;
  return state.rules.turnOnBump || computeSlide(state, penguin).path.length > 0;
}

/** Bir takımın yapabileceği hamleler (sıra kimde olursa olsun). */
export function legalMovesFor(state: GameState, team: TeamId): Move[] {
  if (state.result) return [];
  return state.penguins
    .filter((p) => p.team === team && canAct(state, p))
    .map((p) => ({ penguinId: p.id }));
}

/** Sırası gelen takımın yapabileceği hamleler. Oyun bittiyse boş. */
export function legalMoves(state: GameState): Move[] {
  return legalMovesFor(state, state.turn);
}

/** Takım → yuvadaki penguen sayısı. */
export function homeCounts(state: GameState): Record<TeamId, number> {
  const counts: Record<TeamId, number> = {};
  for (const team of state.teams) counts[team] = 0;
  for (const p of state.penguins) {
    if (p.status === 'home') counts[p.team] = (counts[p.team] ?? 0) + 1;
  }
  return counts;
}

export function isTeamHome(state: GameState, team: TeamId): boolean {
  return state.penguins.every((p) => p.team !== team || p.status === 'home');
}

/**
 * Tek oyunculuda: oyun bitmedi ama hiçbir penguen kıpırdayamıyor.
 * Kaybetmek yok — arayüz oyuncuyu "geri al / baştan başla"ya yönlendirir.
 */
export function isStuck(state: GameState): boolean {
  return !state.result && state.teams.length === 1 && legalMoves(state).length === 0;
}
