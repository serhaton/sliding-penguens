/**
 * Düello maçının kurulumu ve sonucu (saf fonksiyonlar; test edilebilir).
 *
 * Oturuş: takım 0 (mavi) ekranın altındaki oyuncudur, takım 1 (turuncu)
 * üstteki. Bilgisayara karşı oyunda insan her zaman alttadır (takım 0).
 */
import type { Difficulty } from '@/ai';
import { createGame, type GameState, type LevelDef, type TeamId } from '@/engine';

/** Bilgisayarın takımı (üstteki oyuncu). */
export const CPU_TEAM: TeamId = 1;
export const HUMAN_TEAM: TeamId = 0;

export interface DuelSetup {
  /** Bilgisayara karşıysa zorluk; aynı cihazda iki kişiyse null. */
  cpu: Difficulty | null;
  /** İlk hamleyi yapan takım. Rövanşta değişir. */
  starter: TeamId;
  /** Yalnızca geliştirme: iki tarafı da bu zorlukta bilgisayar oynar. */
  demo?: Difficulty | null;
}

/**
 * Maçın başlangıç durumu. Motor her zaman ilk takımla başlar; başlayanı
 * değiştirmek için yalnızca sıra çevrilir. Tahtalar 180° simetrik olduğundan
 * bu, iki oyuncunun yer değiştirmesiyle aynıdır ve adaleti bozmaz.
 */
export function startDuel(board: LevelDef, starter: TeamId): GameState {
  const state = createGame(board);
  return starter === state.turn ? state : { ...state, turn: starter };
}

/** Rövanşta başlayan oyuncu değişir. */
export function otherTeam(team: TeamId): TeamId {
  return team === 0 ? 1 : 0;
}

/** Bir takımın yuvadaki penguen sayısı. */
export function homeCount(state: GameState, team: TeamId): number {
  return state.penguins.filter((p) => p.team === team && p.status === 'home').length;
}

/** Bir takımın toplam penguen sayısı. */
export function teamSize(state: GameState, team: TeamId): number {
  return state.penguins.filter((p) => p.team === team).length;
}

/** Hamle sınırına kalan hamle; sınır yoksa null. */
export function movesLeft(state: GameState): number | null {
  return state.rules.moveLimit === null ? null : Math.max(0, state.rules.moveLimit - state.moveCount);
}

export type DuelOutcome = 'win' | 'loss' | 'draw';

/** Bitmiş maçın `team` açısından sonucu; maç sürüyorsa null. */
export function outcomeFor(state: GameState, team: TeamId): DuelOutcome | null {
  if (!state.result) return null;
  if (state.result.winner === null) return 'draw';
  return state.result.winner === team ? 'win' : 'loss';
}

// --- Seri: düello tek oyun değil, birkaç oyunluk bir seridir ---

/** Düelloyu kazanmak için gereken oyun sayısı. */
export const SERIES_WINS = 3;

/** Takım başına kazanılan oyun sayısı: [takım 0, takım 1]. */
export type SeriesScore = readonly [number, number];

/** Biten oyunun sonucunu seriye işler. Berabere biten oyun kimseye yazılmaz. */
export function addGame(score: SeriesScore, winner: TeamId | null): SeriesScore {
  if (winner === null) return score;
  return winner === 0 ? [score[0] + 1, score[1]] : [score[0], score[1] + 1];
}

/** Seriyi kazanan takım; seri sürüyorsa null. */
export function seriesWinner(score: SeriesScore): TeamId | null {
  if (score[0] >= SERIES_WINS) return 0;
  if (score[1] >= SERIES_WINS) return 1;
  return null;
}
