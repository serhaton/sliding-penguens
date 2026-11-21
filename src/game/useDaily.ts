/** Günlük durumun React bağlantısı (saf hesaplar: game/daily.ts). */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dailyPuzzleKey } from '@/economy/rewards';
import { useWallet } from '@/economy/wallet';
import { todayKey } from '@/services/clock';

import { loginStatus, puzzleStreak } from './daily';
import { wheelStatus } from './wheel';

/** Bugünün tarihi; uygulama öne geldiğinde yenilenir (gece yarısını geçen oturumlar). */
export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(todayKey());
    });
    return () => sub.remove();
  }, []);
  return today;
}

/** Ekranlar için bugünün günlük durumu. */
export function useDaily() {
  const today = useToday();
  const claims = useWallet().state.dailyClaims;
  return {
    today,
    /** Bugünün bulmacası çözüldü mü? */
    solved: claims.includes(dailyPuzzleKey(today)),
    streak: puzzleStreak(claims, today),
    login: loginStatus(claims, today),
    /** Şans çarkı: bugünkü çevirmeler ve kalan haklar. */
    wheel: wheelStatus(claims, today),
  };
}
