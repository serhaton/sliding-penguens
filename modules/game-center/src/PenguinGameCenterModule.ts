/**
 * Yerel Game Center modülünün JavaScript yüzü. Modül bu derlemede yoksa
 * (eski geliştirme derlemesi) `null` döner; çağıran buna göre davranır.
 * Ekranlar burayı değil, services/gameCenter.ts'i kullanır.
 */
import { requireOptionalNativeModule } from 'expo';

export interface GameCenterNative {
  isAuthenticated(): boolean;
  authenticate(): Promise<{ authenticated: boolean; alias?: string }>;
  submitScore(leaderboardId: string, score: number): Promise<boolean>;
  reportAchievement(achievementId: string, percent: number): Promise<boolean>;
  show(kind: 'leaderboards' | 'achievements' | 'leaderboard', leaderboardId: string | null): Promise<boolean>;
}

export default requireOptionalNativeModule<GameCenterNative>('PenguinGameCenter');
