/**
 * Başarım ve skor eşitleyici. Oyuncunun durumu her değiştiğinde (cüzdan,
 * sayaçlar, mağaza, Game Center girişi) koşulu sağlanan başarımları bulur:
 *  - yeni kazanılanın coin ödülünü cüzdana yazar (cüzdan aynı başarımı iki kez ödemez),
 *  - Game Center'a bildirir,
 *  - ekranda kısa bir not gösterir (useAchievementToast),
 * ve üç liderlik tablosuna güncel skoru gönderir.
 */
import { create } from 'zustand';

import type { AchievementId } from '@/economy/economy.config';
import { wallet } from '@/economy/wallet';
import { earnedAchievements, gameCenterAchievementId, leaderboards } from '@/game/achievements';
import { ownedCosmetics } from '@/game/avatar';
import { puzzleStreak } from '@/game/daily';
import { cpuFirstWinKey } from '@/economy/rewards';
import { useSettings } from '@/store/settings';

import { todayKey } from './clock';
import { devFlags } from './devFlags';
import { gameCenter, useGameCenter } from './gameCenter';
import { useStore } from './store';

/** Ekranda gösterilmeyi bekleyen yeni başarımlar. */
export const useAchievementToast = create<{ queue: AchievementId[] }>(() => ({ queue: [] }));

export function dismissAchievementToast(): void {
  useAchievementToast.setState((s) => ({ queue: s.queue.slice(1) }));
}

let started = false;
let running = false;
let again = false;
/** Game Center'a bu oturumda bildirilmiş başarımlar ve gönderilmiş skorlar. */
const reported = new Set<AchievementId>();
const sentScores: Record<string, number> = {};

async function check(): Promise<void> {
  // Aynı anda tek denetim: bu sırada gelen değişiklikler bir tur daha döndürür.
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      const { state } = wallet().getSnapshot();
      const { counters } = useSettings.getState();
      const streak = puzzleStreak(state.dailyClaims, todayKey());
      const totalStars = Object.values(state.stars).reduce((sum, n) => sum + n, 0);

      const earned = earnedAchievements({
        stars: state.stars,
        streak,
        duelWins: state.duelStats.wins,
        beatHard: state.duelRewards.includes(cpuFirstWinKey('hard')),
        cosmetics: ownedCosmetics(state.cosmetics, useStore.getState().entitlements).size,
        noUndoWins: counters.noUndoWins,
        duelBlocks: counters.duelBlocks,
      });

      for (const id of earned) {
        if (!state.achievements.includes(id)) {
          const coins = await wallet().unlockAchievement(id);
          if (coins > 0 && !devFlags.quiet) useAchievementToast.setState((s) => ({ queue: [...s.queue, id] }));
        }
        if (!reported.has(id) && (await gameCenter.reportAchievement(gameCenterAchievementId(id)))) reported.add(id);
      }

      const scores: Record<string, number> = {
        [leaderboards.totalStars]: totalStars,
        [leaderboards.dailyStreak]: streak,
        [leaderboards.hardCpuWins]: counters.hardCpuWins,
      };
      for (const [board, score] of Object.entries(scores)) {
        if (score > 0 && sentScores[board] !== score && (await gameCenter.submitScore(board, score))) {
          sentScores[board] = score;
        }
      }
    } while (again);
  } finally {
    running = false;
  }
}

/** Uygulama açılışında bir kez çağrılır (kök yerleşimden). */
export function startAchievements(): void {
  if (started) return;
  started = true;
  const run = () => void check();
  wallet().subscribe(run);
  useSettings.subscribe(run);
  useStore.subscribe(run);
  useGameCenter.subscribe(run);
  run();
}
