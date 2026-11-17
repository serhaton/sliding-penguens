/**
 * Durumu kompakt bir metne çevirir ve geri okur.
 *
 * Kullanım yerleri: yarım kalan bölümü kaydetme, maç kaydı, ve 1.1'de Game
 * Center sıra tabanlı maç verisi (orada boyut sınırı var, bu yüzden alan adları
 * tek harf ve değerler dizi). `deserialize(serialize(s))` her zaman `s`'ye eşittir.
 *
 * Biçim değişirse SERIAL_VERSION artırılmalı ve eski sürüm okunmaya devam etmeli.
 */
import { CELL_CHARS, cellFromChar } from './grid';
import type {
  Direction,
  GameOverReason,
  GameResult,
  GameState,
  Igloo,
  Penguin,
  PenguinColor,
  PenguinStatus,
  Rules,
  TeamId,
} from './types';

export const SERIAL_VERSION = 1;

type PenguinTuple = [id: string, color: PenguinColor, team: TeamId, dir: Direction, x: number, y: number, status: PenguinStatus];
type IglooTuple = [id: string, x: number, y: number, color: PenguinColor | null, team: TeamId | null, capacity: number | null, occupants: number];

interface SerializedState {
  v: number;
  w: number;
  h: number;
  /** Hücreler, satır satır tek bir metin. */
  c: string;
  p: PenguinTuple[];
  g: IglooTuple[];
  t: TeamId[];
  /** [turn, turnNumber, movesLeftInTurn, moveCount, consecutivePasses] */
  n: [number, number, number, number, number];
  /** [iglooMatch, moveLimit, secondPlayerExtraMove, turnOnBump] */
  r: [Rules['iglooMatch'], number | null, 0 | 1, (0 | 1)?];
  /** [winner, reason, homeCounts] ya da null */
  o: [TeamId | null, GameOverReason, Record<TeamId, number>] | null;
}

export function serialize(state: GameState): string {
  const data: SerializedState = {
    v: SERIAL_VERSION,
    w: state.width,
    h: state.height,
    c: state.cells.map((cell) => CELL_CHARS[cell]).join(''),
    p: state.penguins.map((p) => [p.id, p.color, p.team, p.dir, p.x, p.y, p.status]),
    g: state.igloos.map((g) => [g.id, g.x, g.y, g.color, g.team, g.capacity, g.occupants]),
    t: [...state.teams],
    n: [state.turn, state.turnNumber, state.movesLeftInTurn, state.moveCount, state.consecutivePasses],
    r: [
      state.rules.iglooMatch,
      state.rules.moveLimit,
      state.rules.secondPlayerExtraMove ? 1 : 0,
      state.rules.turnOnBump ? 1 : 0,
    ],
    o: state.result
      ? [state.result.winner, state.result.reason, { ...state.result.homeCounts }]
      : null,
  };
  return JSON.stringify(data);
}

/** Bozuk ya da bilinmeyen sürümde hata fırlatır. */
export function deserialize(text: string): GameState {
  const data = JSON.parse(text) as SerializedState;
  if (data.v !== SERIAL_VERSION) {
    throw new Error(`Desteklenmeyen kayıt sürümü: ${String(data.v)}`);
  }
  if (data.c.length !== data.w * data.h) throw new Error('Kayıt bozuk: hücre sayısı uyuşmuyor');

  const penguins: Penguin[] = data.p.map(([id, color, team, dir, x, y, status]) => ({
    id, color, team, dir, x, y, status,
  }));
  const igloos: Igloo[] = data.g.map(([id, x, y, color, team, capacity, occupants]) => ({
    id, x, y, color, team, capacity, occupants,
  }));
  const [turn, turnNumber, movesLeftInTurn, moveCount, consecutivePasses] = data.n;
  const result: GameResult | null = data.o
    ? { winner: data.o[0], reason: data.o[1], homeCounts: data.o[2] }
    : null;

  return {
    width: data.w,
    height: data.h,
    cells: [...data.c].map((ch) => {
      const cell = cellFromChar(ch);
      if (!cell) throw new Error(`Kayıt bozuk: bilinmeyen hücre '${ch}'`);
      return cell;
    }),
    penguins,
    igloos,
    teams: data.t,
    turn,
    turnNumber,
    movesLeftInTurn,
    moveCount,
    consecutivePasses,
    rules: {
      iglooMatch: data.r[0],
      moveLimit: data.r[1],
      secondPlayerExtraMove: data.r[2] === 1,
      // Bu alan eklenmeden önce yazılmış kayıtlarda yok: kapalı say.
      turnOnBump: data.r[3] === 1,
    },
    result,
  };
}

/**
 * Çözücü ve yapay zekâ için kısa durum anahtarı: yalnızca oyun sırasında
 * değişen kısımlar (penguen konum/durumları, kırılan hücreler, sıra).
 * Aynı tahtadan türeyen iki durum ancak ve ancak anahtarları eşitse aynıdır.
 */
export function stateKey(state: GameState): string {
  let key = '';
  for (const p of state.penguins) {
    // Yön de durumun parçası: "çarpınca dön" kuralında değişebilir.
    key += p.status === 'home' ? 'h' : `${p.status === 'asleep' ? 'z' : ''}${p.y * state.width + p.x}${p.dir[0]}`;
    key += ',';
  }
  key += '|';
  state.cells.forEach((cell, i) => {
    if (cell === 'water') key += `${i},`;
  });
  key += '|';
  for (const g of state.igloos) key += g.occupants;
  key += `|${state.turn}.${state.movesLeftInTurn}`;
  return key;
}
