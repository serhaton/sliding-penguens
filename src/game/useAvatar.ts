import { useMemo } from 'react';

import { useWallet } from '@/economy/wallet';
import { useStore } from '@/services/store';

import { avatarFrom, ownedCosmetics, type Avatar } from './avatar';

/** Sahip olunan kostümler: coinle açılanlar + satın alınan paketlerden çıkanlar. */
export function useOwnedCosmetics(): ReadonlySet<string> {
  const bought = useWallet().state.cosmetics;
  const entitlements = useStore((s) => s.entitlements);
  return useMemo(() => ownedCosmetics(bought, entitlements), [bought, entitlements]);
}

/** Oyuncunun profil pengueni; cüzdan (ya da iCloud) değişince yenilenir. */
export function useAvatar(): Avatar {
  const equipped = useWallet().state.profile.equipped;
  const owned = useOwnedCosmetics();
  return useMemo(() => avatarFrom(equipped, owned), [equipped, owned]);
}
