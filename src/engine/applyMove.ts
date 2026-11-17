/**
 * Motorun kalbi: `applyMove(state, move) → { state, events, accepted }`.
 *
 * Saf ve belirlenimcidir: aynı durum + aynı hamle her zaman aynı sonucu verir,
 * rastgelelik ya da saat yoktur. Girdi durumu asla değiştirilmez.
 */
import { CLOCKWISE, cellIndex } from './grid';
import { computeSlide, homeCounts, isTeamHome, legalMovesFor } from './rules';
import type {
  CellType,
  GameEvent,
  GameOverReason,
  GameResult,
  GameState,
  Move,
  MoveOutcome,
  RejectReason,
  Vec,
} from './types';

function reject(
  state: GameState,
  penguinId: string,
  reason: RejectReason,
  extra?: Pick<Extract<GameEvent, { type: 'rejected' }>, 'obstacle'>,
): MoveOutcome {
  return {
    state,
    accepted: false,
    events: [{ type: 'rejected', penguinId, reason, ...extra }],
  };
}

/** Yuvadaki penguen sayısına göre sonuç: çok olan kazanır, eşitse berabere. */
function resultByHomeCount(state: GameState, reason: GameOverReason): GameResult {
  const counts = homeCounts(state);
  const best = Math.max(...state.teams.map((t) => counts[t] ?? 0));
  const leaders = state.teams.filter((t) => (counts[t] ?? 0) === best);
  return { winner: leaders.length === 1 ? leaders[0]! : null, reason, homeCounts: counts };
}

export function applyMove(state: GameState, move: Move): MoveOutcome {
  const { penguinId } = move;
  if (state.result) return reject(state, penguinId, 'gameOver');

  const penguin = state.penguins.find((p) => p.id === penguinId);
  if (!penguin) return reject(state, penguinId, 'unknownPenguin');
  if (penguin.status !== 'active') return reject(state, penguinId, 'notActive');
  if (penguin.team !== state.turn) return reject(state, penguinId, 'notYourTurn');

  const slide = computeSlide(state, penguin);
  const turns = state.rules.turnOnBump;
  if (slide.path.length === 0 && !turns) {
    // Kıpırdayamıyor: hamle sayılmaz, uyuyan penguen de uyanmaz.
    return reject(state, penguinId, 'blocked', { obstacle: slide.obstacle ?? undefined });
  }

  const events: GameEvent[] = [];
  const from: Vec = { x: penguin.x, y: penguin.y };
  // Önü kapalıyken (yalnızca "çarpınca dön" kuralında) penguen yerinde kalır.
  const to = slide.path[slide.path.length - 1] ?? from;
  const moved = slide.path.length > 0;

  if (moved) {
    events.push({
      type: 'slide',
      penguinId,
      dir: penguin.dir,
      from,
      to,
      distance: slide.path.length,
    });
  }

  // --- Çatlak buz: penguenin ayrıldığı her çatlak hücre suya döner ---
  // Ayrıldığı hücreler: başlangıç + yolun son hücresi dışındakiler.
  // (Son hücrede ya durdu ya da orası igloo; ikisinde de "ayrılmadı".)
  let cells: readonly CellType[] = state.cells;
  const left = moved ? [from, ...slide.path.slice(0, -1)] : [];
  left.forEach((cell, step) => {
    const index = cellIndex(state, cell.x, cell.y);
    if (cells[index] !== 'cracked') return;
    if (cells === state.cells) cells = [...state.cells];
    (cells as CellType[])[index] = 'water';
    events.push({ type: 'crackBreak', x: cell.x, y: cell.y, step });
  });

  // --- Penguenler ve igloolar ---
  let penguins = state.penguins.map((p) =>
    p.id === penguinId
      ? { ...p, x: to.x, y: to.y, status: slide.enteredIglooId ? ('home' as const) : p.status }
      : p,
  );
  let igloos = state.igloos;

  if (slide.enteredIglooId) {
    igloos = igloos.map((g) =>
      g.id === slide.enteredIglooId ? { ...g, occupants: g.occupants + 1 } : g,
    );
    events.push({ type: 'enterIgloo', penguinId, iglooId: slide.enteredIglooId });
  } else if (slide.obstacle) {
    const obstacle = slide.obstacle;
    if (moved) events.push({ type: 'bump', penguinId, at: to, obstacle });
    if (turns) {
      // Çarpınca (ya da önü kapalıyken dokununca) saat yönünde döner.
      const turned = CLOCKWISE[penguin.dir];
      penguins = penguins.map((p) => (p.id === penguinId ? { ...p, dir: turned } : p));
      events.push({ type: 'turn', penguinId, from: penguin.dir, to: turned });
    }
    if (moved && obstacle.kind === 'penguin') {
      const hit = penguins.find((p) => p.id === obstacle.penguinId);
      if (hit?.status === 'asleep') {
        penguins = penguins.map((p) => (p.id === hit.id ? { ...p, status: 'active' as const } : p));
        events.push({ type: 'wakeUp', penguinId: hit.id, byPenguinId: penguinId });
      }
    }
  }

  let next: GameState = {
    ...state,
    cells,
    penguins,
    igloos,
    moveCount: state.moveCount + 1,
    consecutivePasses: 0,
    movesLeftInTurn: state.movesLeftInTurn - 1,
  };

  // --- Oyun bitti mi? Önce "hepsi yuvada", sonra hamle sınırı ---
  let result: GameResult | null = null;
  if (isTeamHome(next, penguin.team)) {
    result = { winner: penguin.team, reason: 'allHome', homeCounts: homeCounts(next) };
  } else if (next.rules.moveLimit !== null && next.moveCount >= next.rules.moveLimit) {
    result = resultByHomeCount(next, 'moveLimit');
  }

  if (!result) {
    const advanced = advanceTurn(next, events);
    next = advanced.state;
    result = advanced.result;
  }

  if (result) {
    next = { ...next, result };
    events.push({ type: 'gameOver', result });
  }

  return { state: next, events, accepted: true };
}

/**
 * Hamleden sonra sırayı ilerletir. Hamlesi olmayan takım otomatik pas geçer;
 * bütün takımlar art arda pas geçerse oyun yuvadaki penguen sayısıyla biter.
 */
function advanceTurn(
  state: GameState,
  events: GameEvent[],
): { state: GameState; result: GameResult | null } {
  // Tek oyunculu: sıra hep aynı oyuncuda. Hamlesi kalmasa da oyun bitmez
  // (kaybetmek yok; oyuncu geri alır ya da baştan başlar) — bkz. isStuck.
  if (state.teams.length === 1) return { state: { ...state, movesLeftInTurn: 1 }, result: null };

  // Aynı takımın bu turda hakkı kaldıysa (ekstra hamle kuralı) ve oynayabiliyorsa sıra onda kalır.
  if (state.movesLeftInTurn > 0 && legalMovesFor(state, state.turn).length > 0) {
    return { state, result: null };
  }

  let next = state;
  for (;;) {
    const index = next.teams.indexOf(next.turn);
    const team = next.teams[(index + 1) % next.teams.length]!;
    const turnNumber = next.turnNumber + 1;
    // Adalet kuralı: ikinci oyuncunun ilk turu (tur 1) iki hamlelik olabilir.
    const movesInTurn = next.rules.secondPlayerExtraMove && turnNumber === 1 ? 2 : 1;
    next = { ...next, turn: team, turnNumber, movesLeftInTurn: movesInTurn };
    events.push({ type: 'turnChange', team, movesInTurn });

    if (legalMovesFor(next, team).length > 0) return { state: next, result: null };

    next = { ...next, consecutivePasses: next.consecutivePasses + 1 };
    events.push({ type: 'pass', team });
    if (next.consecutivePasses >= next.teams.length) {
      return { state: next, result: resultByHomeCount(next, 'noMoves') };
    }
  }
}

/**
 * Bir hamle listesini baştan oynatır (tekrar izleme, kayıt doğrulama).
 * Listede geçersiz bir hamle varsa hata fırlatır: kayıt bozuk demektir.
 */
export function replay(
  initial: GameState,
  moves: readonly Move[],
): { state: GameState; events: GameEvent[][] } {
  let state = initial;
  const events: GameEvent[][] = [];
  moves.forEach((move, i) => {
    const outcome = applyMove(state, move);
    if (!outcome.accepted) {
      const reason = outcome.events[0]?.type === 'rejected' ? outcome.events[0].reason : '?';
      throw new Error(`Kayıt bozuk: ${i}. hamle (${move.penguinId}) geçersiz — ${reason}`);
    }
    state = outcome.state;
    events.push([...outcome.events]);
  });
  return { state, events };
}
