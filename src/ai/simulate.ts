/**
 * Bilgisayar-bilgisayara maçlar: tahtaların adil ve keyifli olup olmadığını
 * ölçmek için (geliştirici aracı ve testler; oyunun içinde kullanılmaz).
 */
import { applyMove, createGame, legalMoves, type GameState, type LevelDef, type TeamId } from '@/engine';
import type { Rng } from '@/generator/rng';

import { chooseMove, type Difficulty } from './index';

export interface GameRecord {
  /** Kazanan takım; berabere ise null. */
  winner: TeamId | null;
  /** Toplam hamle (iki takım birlikte). */
  moves: number;
  reason: NonNullable<GameState['result']>['reason'];
}

export interface PlayOptions {
  /** Takım 0 ve takım 1'in zorlukları. */
  players: readonly [Difficulty, Difficulty];
  /**
   * Maçın başında rastgele oynanan hamle sayısı (toplam). Zor yapay zekâ
   * neredeyse belirlenimci olduğundan, farklı maçlar görmek için açılışlar
   * rastgele seçilir.
   */
  randomOpening?: number;
  /** Sonsuz döngüye karşı emniyet (hamle sınırı olmayan tahtalar için). */
  maxMoves?: number;
}

/** Tek bir maçı sonuna kadar oynatır. */
export function playGame(board: LevelDef, rng: Rng, options: PlayOptions): GameRecord {
  let state = createGame(board);
  const maxMoves = options.maxMoves ?? 200;
  const opening = options.randomOpening ?? 0;

  while (!state.result && state.moveCount < maxMoves) {
    const move =
      state.moveCount < opening
        ? rng.pick(legalMoves(state))
        : chooseMove(state, options.players[state.teams.indexOf(state.turn)]!, rng);
    if (!move) break;
    state = applyMove(state, move).state;
  }
  return {
    winner: state.result?.winner ?? null,
    moves: state.moveCount,
    reason: state.result?.reason ?? 'moveLimit',
  };
}

export interface BoardStats {
  games: number;
  /** İlk oynayan (takım 0), ikinci oynayan (takım 1) ve beraberlik sayıları. */
  firstWins: number;
  secondWins: number;
  draws: number;
  /** Sonuçlanan maçlarda ilk oynayanın kazanma oranı (0–1); hiç sonuç yoksa 0.5. */
  firstWinShare: number;
  drawRate: number;
  averageMoves: number;
  shortestGame: number;
  longestGame: number;
  /** Hamle sınırına takılan maçların oranı. */
  limitRate: number;
}

/** Aynı tahtada `games` maç oynatır ve özetler. */
export function simulateBoard(board: LevelDef, rng: Rng, games: number, options: PlayOptions): BoardStats {
  const records = Array.from({ length: games }, () => playGame(board, rng, options));
  const firstWins = records.filter((r) => r.winner === 0).length;
  const secondWins = records.filter((r) => r.winner === 1).length;
  const draws = games - firstWins - secondWins;
  const decided = firstWins + secondWins;
  const lengths = records.map((r) => r.moves);
  return {
    games,
    firstWins,
    secondWins,
    draws,
    firstWinShare: decided > 0 ? firstWins / decided : 0.5,
    drawRate: draws / games,
    averageMoves: lengths.reduce((sum, n) => sum + n, 0) / games,
    shortestGame: Math.min(...lengths),
    longestGame: Math.max(...lengths),
    limitRate: records.filter((r) => r.reason !== 'allHome').length / games,
  };
}
