/**
 * Bölüm / tahta tanımı (JSON'da saklanan biçim) ve ondan başlangıç durumu kurma.
 *
 * Tek oyunculu bölümler de düello tahtaları da aynı biçimi kullanır; fark
 * yalnızca `mode` ve kurallardadır. Tek oyunculu, tek takımlı özel durumdur.
 */
import { cellFromChar } from './grid';
import type {
  CellType,
  Direction,
  GameState,
  Igloo,
  Penguin,
  PenguinColor,
  Rules,
  TeamId,
} from './types';

export interface PenguinDef {
  /** Verilmezse sıraya göre p0, p1, ... */
  id?: string;
  color: PenguinColor;
  dir: Direction;
  x: number;
  y: number;
  /** Verilmezse 0. */
  team?: TeamId;
  /** Uyuyan penguen: başka bir penguen çarpana kadar engel gibi durur. */
  asleep?: boolean;
  /** Görsel karakter (isim/kişilik) — motor kullanmaz, arayüz okur. */
  character?: string;
}

export interface IglooDef {
  /** Verilmezse sıraya göre g0, g1, ... */
  id?: string;
  x: number;
  y: number;
  /** Tek oyunculuda zorunlu: kabul ettiği renk. */
  color?: PenguinColor;
  /** Düelloda zorunlu: sahibi olan takım. */
  team?: TeamId;
  /** Verilmezse: tek oyunculuda sınırsız, düelloda 1. */
  capacity?: number | null;
}

export interface LevelDef {
  id: string;
  /** Verilmezse 'solo'. */
  mode?: 'solo' | 'duel';
  /**
   * Zemin, satır satır. Her karakter bir hücre:
   *   .  buz      #  kaya      ~  su      +  çatlak buz
   * Penguenler ve igloolar ayrı listelerde durur (zeminleri buz olmalı).
   */
  grid: string[];
  penguins: PenguinDef[];
  igloos: IglooDef[];
  /** Varsayılan kuralların üstüne yazılacak ayarlar. */
  rules?: Partial<Rules>;
  /**
   * Dalgalar: ilk grup (`penguins`) yuvaya girince sırayla gelen sonraki
   * penguen grupları. Tahta ve igloolar bölüm boyunca aynı kalır. Her dalga
   * kendi başına bir bulmacadır (bkz. `stageLevel`); bölüm, hepsi bitince biter.
   */
  waves?: PenguinDef[][];

  // --- Yalnızca tek oyunculu bölümlerde; motor kullanmaz ---
  world?: number;
  /**
   * Bu bölümde ilk kez karşılaşılan mekanik: bölümden önce kısa bir tanıtım
   * animasyonu gösterilir (bkz. data/mechanics.ts).
   */
  intro?: string;
  /** Çözücünün bulduğu en az hamle sayısı. */
  par?: number;
  /** Önceden hesaplanmış en kısa çözüm: dokunulacak penguen kimlikleri. */
  solution?: string[];
  /** Dalgalı bölümlerde dalga başına en az hamle (toplamı `par`). */
  wavePars?: number[];
  /** Dalgalı bölümlerde dalga başına en kısa çözüm. */
  waveSolutions?: string[][];
}

/** Bölümdeki dalga sayısı (dalgasız bölümde 1). */
export function waveCount(def: LevelDef): number {
  return 1 + (def.waves?.length ?? 0);
}

/**
 * Bölümün `wave` numaralı dalgasını (0'dan başlar) tek başına bir bölüm olarak
 * verir: aynı tahta, aynı igloolar, o dalganın penguenleri. Motor, çözücü ve
 * ipucu her dalgayı sıradan bir bölüm gibi görür.
 */
export function stageLevel(def: LevelDef, wave: number): LevelDef {
  const { waves, wavePars, waveSolutions, ...base } = def;
  if (!waves || waves.length === 0) return def;
  const penguins = wave === 0 ? def.penguins : waves[wave - 1];
  if (!penguins) throw new LevelError(def.id, `dalga ${wave} yok`);
  return {
    ...base,
    penguins,
    par: wavePars?.[wave],
    solution: waveSolutions?.[wave],
  };
}

export const SOLO_RULES: Rules = {
  iglooMatch: 'color',
  moveLimit: null,
  secondPlayerExtraMove: false,
  turnOnBump: false,
};

export const DUEL_RULES: Rules = {
  iglooMatch: 'team',
  moveLimit: 30,
  secondPlayerExtraMove: false,
  // Düelloda da penguenler çarpınca döner: sabit yönde her penguen bir iki kez
  // kayıp kalıyor, maç birkaç hamlede bitiyordu (simülasyonla ölçüldü).
  turnOnBump: true,
};

/** Bölüm tanımı kurallara aykırıysa fırlatılır; mesaj hatanın yerini söyler. */
export class LevelError extends Error {
  constructor(levelId: string, message: string) {
    super(`[${levelId}] ${message}`);
    this.name = 'LevelError';
  }
}

/**
 * Bölüm tanımını doğrular ve başlangıç durumunu kurar.
 * Hatalı tanımda `LevelError` fırlatır; bölüm doğrulama testleri buna dayanır.
 */
export function createGame(def: LevelDef): GameState {
  const fail = (message: string): never => {
    throw new LevelError(def.id, message);
  };
  const mode = def.mode ?? 'solo';
  const rules: Rules = { ...(mode === 'duel' ? DUEL_RULES : SOLO_RULES), ...def.rules };

  // --- Zemin ---
  const height = def.grid.length;
  const width = def.grid[0]?.length ?? 0;
  if (width === 0 || height === 0) fail('ızgara boş');
  const cells: CellType[] = [];
  def.grid.forEach((row, y) => {
    if (row.length !== width) fail(`satır ${y} uzunluğu ${row.length}, beklenen ${width}`);
    for (const ch of row) {
      cells.push(cellFromChar(ch) ?? fail(`satır ${y}: bilinmeyen hücre karakteri '${ch}'`));
    }
  });
  const cellOf = (x: number, y: number) => cells[y * width + x];
  const inside = (x: number, y: number) =>
    Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height;

  // --- Nesneler: her hücrede en fazla bir penguen ya da igloo ---
  const occupied = new Map<number, string>();
  const ids = new Set<string>();
  const claim = (id: string, x: number, y: number) => {
    if (ids.has(id)) fail(`'${id}' kimliği iki kez kullanılmış`);
    ids.add(id);
    if (!inside(x, y)) fail(`'${id}' tahtanın dışında (${x},${y})`);
    const key = y * width + x;
    const other = occupied.get(key);
    if (other !== undefined) fail(`'${id}' ile '${other}' aynı hücrede (${x},${y})`);
    occupied.set(key, id);
  };

  const igloos: Igloo[] = def.igloos.map((g, i) => {
    const id = g.id ?? `g${i}`;
    claim(id, g.x, g.y);
    if (cellOf(g.x, g.y) !== 'ice') fail(`igloo '${id}' buz olmayan bir hücrede`);
    if (rules.iglooMatch === 'color' && g.color === undefined) fail(`igloo '${id}' için renk gerekli`);
    if (rules.iglooMatch === 'team' && g.team === undefined) fail(`igloo '${id}' için takım gerekli`);
    const capacity = g.capacity !== undefined ? g.capacity : mode === 'duel' ? 1 : null;
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
      fail(`igloo '${id}' kapasitesi geçersiz`);
    }
    return {
      id,
      x: g.x,
      y: g.y,
      color: g.color ?? null,
      team: g.team ?? (mode === 'solo' ? 0 : null),
      capacity,
      occupants: 0,
    };
  });

  const penguins: Penguin[] = def.penguins.map((p, i) => {
    const id = p.id ?? `p${i}`;
    claim(id, p.x, p.y);
    const cell = cellOf(p.x, p.y);
    if (cell !== 'ice' && cell !== 'cracked') fail(`penguen '${id}' ${cell} üstünde başlıyor`);
    return {
      id,
      color: p.color,
      team: p.team ?? 0,
      dir: p.dir,
      x: p.x,
      y: p.y,
      status: p.asleep ? 'asleep' : 'active',
    };
  });
  if (penguins.length === 0) fail('hiç penguen yok');

  // --- Takımlar ---
  const teams = [...new Set(penguins.map((p) => p.team))].sort((a, b) => a - b);
  if (mode === 'solo' && teams.length !== 1) fail('tek oyunculu bölümde tek takım olmalı');
  if (mode === 'duel' && teams.length !== 2) fail('düello tahtasında tam iki takım olmalı');

  // --- Her penguenin girebileceği bir yuva olmalı ---
  if (rules.iglooMatch === 'color') {
    for (const p of penguins) {
      const room = igloos
        .filter((g) => g.color === p.color)
        .reduce((sum, g) => sum + (g.capacity ?? Infinity), 0);
      const sameColor = penguins.filter((q) => q.color === p.color).length;
      if (room < sameColor) fail(`'${p.color}' penguenleri için yeterli igloo yok`);
    }
  } else {
    for (const team of teams) {
      const room = igloos
        .filter((g) => g.team === team)
        .reduce((sum, g) => sum + (g.capacity ?? Infinity), 0);
      const members = penguins.filter((p) => p.team === team).length;
      if (room < members) fail(`takım ${team} için yeterli igloo yok`);
    }
  }
  if (rules.moveLimit !== null && (!Number.isInteger(rules.moveLimit) || rules.moveLimit < 1)) {
    fail('hamle sınırı geçersiz');
  }

  return {
    width,
    height,
    cells,
    penguins,
    igloos,
    teams,
    turn: teams[0]!,
    turnNumber: 0,
    movesLeftInTurn: 1,
    moveCount: 0,
    consecutivePasses: 0,
    rules,
    result: null,
  };
}
