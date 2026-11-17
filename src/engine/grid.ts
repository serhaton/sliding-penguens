/** Izgara yardımcıları: yön vektörleri, indeksleme, hücre karakterleri. */
import type { CellType, Direction, GameState, Vec } from './types';

export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];

/** Ekran koordinatları: x sağa, y aşağı doğru artar. */
export const DIR_VECTORS: Readonly<Record<Direction, Vec>> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

/** Saat yönünde 90° dönüş: yukarı → sağ → aşağı → sol → yukarı. */
export const CLOCKWISE: Readonly<Record<Direction, Direction>> = {
  up: 'right',
  right: 'down',
  down: 'left',
  left: 'up',
};

/**
 * Hücrelerin tek karakterlik yazımı. Hem bölüm dosyalarındaki ızgarada hem de
 * serileştirmede kullanılır, bu yüzden değiştirilirse eski kayıtlar bozulur.
 */
export const CELL_CHARS: Readonly<Record<CellType, string>> = {
  ice: '.',
  rock: '#',
  water: '~',
  cracked: '+',
};

const CHAR_CELLS: Readonly<Record<string, CellType>> = Object.fromEntries(
  (Object.entries(CELL_CHARS) as [CellType, string][]).map(([cell, ch]) => [ch, cell]),
);

export function cellFromChar(ch: string): CellType | undefined {
  return CHAR_CELLS[ch];
}

export function inBounds(state: Pick<GameState, 'width' | 'height'>, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.width && y < state.height;
}

export function cellIndex(state: Pick<GameState, 'width'>, x: number, y: number): number {
  return y * state.width + x;
}

/** Sınır dışı için undefined döner. */
export function cellAt(state: GameState, x: number, y: number): CellType | undefined {
  return inBounds(state, x, y) ? state.cells[cellIndex(state, x, y)] : undefined;
}
