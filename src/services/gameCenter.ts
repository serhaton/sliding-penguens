/**
 * Game Center: giriş, liderlik tabloları, başarımlar. Yalnızca skor ve başarım
 * gösterimi içindir; coin ve ilerleme burada saklanmaz (onlar iCloud'da).
 *
 * Oyuncu giriş yapmadıysa ya da yerel modül bu derlemede yoksa bütün çağrılar
 * sessizce hiçbir şey yapmaz: oyun Game Center'sız da eksiksiz çalışır.
 */
import { create } from 'zustand';

import native from '../../modules/game-center/src/PenguinGameCenterModule';

export interface GameCenterState {
  /** Yerel modül bu derlemede var mı? */
  available: boolean;
  signedIn: boolean;
  /** Oyuncunun Game Center takma adı. */
  alias: string | null;
}

export const useGameCenter = create<GameCenterState>(() => ({ available: native !== null, signedIn: false, alias: null }));

let signing: Promise<boolean> | null = null;

export const gameCenter = {
  /**
   * Giriş yapar. Oyuncu cihazda Game Center'a girmişse sessizce tamamlanır;
   * girmemişse sistemin giriş penceresi açılabilir. Asla hata fırlatmaz.
   */
  signIn(): Promise<boolean> {
    if (!native) return Promise.resolve(false);
    signing ??= native
      .authenticate()
      .then((result) => {
        useGameCenter.setState({ signedIn: result.authenticated, alias: result.alias ?? null });
        return result.authenticated;
      })
      .catch(() => false)
      .finally(() => {
        signing = null;
      });
    return signing;
  },

  submitScore(leaderboardId: string, score: number): Promise<boolean> {
    if (!native || !useGameCenter.getState().signedIn) return Promise.resolve(false);
    return native.submitScore(leaderboardId, Math.max(0, Math.floor(score))).catch(() => false);
  },

  /** Başarımı tamamlanmış olarak bildirir (tekrar bildirmek zararsızdır). */
  reportAchievement(achievementId: string): Promise<boolean> {
    if (!native || !useGameCenter.getState().signedIn) return Promise.resolve(false);
    return native.reportAchievement(achievementId, 100).catch(() => false);
  },

  /** Game Center ekranını açar. Giriş yapılmadıysa önce giriş denenir. */
  async show(kind: 'leaderboards' | 'achievements'): Promise<boolean> {
    if (!native) return false;
    if (!useGameCenter.getState().signedIn && !(await gameCenter.signIn())) return false;
    return native.show(kind, null).catch(() => false);
  },
};
