/**
 * Reklam servisi (AdMob). Ekranlar reklam kütüphanesini doğrudan çağırmaz;
 * yalnızca buradaki `ads` nesnesini kullanır.
 *
 *   ads.warmUp()                    // izinler + ilk yükleme (bir kez)
 *   useRewardedReady()              // "2 katı" gibi butonlar görünsün mü?
 *   await ads.showRewarded()        // sonuna kadar izlendiyse true
 *   await ads.afterLevel(number)    // gerekiyorsa araya giren reklam
 *
 * Sıra: önce Google'ın rıza formu (yalnızca gereken bölgelerde çıkar), sonra
 * iOS izleme izni, sonra SDK başlatılır ve reklamlar önceden yüklenir. İzin
 * verilmese de reklam gösterilir; yalnızca kişiselleştirilmez.
 *
 * Reklam hazır değilse ona bağlı buton hiç görünmez: kimseye izlemediği
 * reklamın ödülü verilmez, kimse boş bir reklam ekranında bekletilmez.
 *
 * Geliştirme sürümünde Google'ın test birimleri kullanılır. Yerel modülü
 * olmayan eski bir geliştirme derlemesinde kısa bir bekleme reklamı taklit eder.
 */
import { TurboModuleRegistry } from 'react-native';
import { create } from 'zustand';

import { hasNoAds } from '@/data/products';
import { shouldShowInterstitial } from '@/game/adPolicy';

import { adsConfig } from './ads.config';
import { useStore } from './store';

type Gma = typeof import('react-native-google-mobile-ads');
type Rewarded = ReturnType<Gma['RewardedAd']['createForAdRequest']>;
type Interstitial = ReturnType<Gma['InterstitialAd']['createForAdRequest']>;

/** Taklit reklamın süresi (ms). */
const FAKE_AD_MS = 900;
/** Yükleme başarısız olursa yeniden denemeden önce beklenen süre (ms). */
const RETRY_MS = 30_000;

interface AdsState {
  rewardedReady: boolean;
}
const useAds = create<AdsState>(() => ({ rewardedReady: false }));

let gma: Gma | null = null;
/** Yerel modül yok (eski geliştirme derlemesi): reklamlar taklit edilir. */
let fake = false;
let warming: Promise<void> | null = null;
let rewarded: Rewarded | null = null;
let interstitial: Interstitial | null = null;
let interstitialReady = false;
/** Araya giren reklamın sayaçları (oturum boyunca). */
let levelsSinceLast = 0;
let lastInterstitialAt = 0;

const units = () => (__DEV__ ? adsConfig.testUnits : adsConfig.units);

function loadRewarded(): void {
  if (!gma) return;
  const { RewardedAd, RewardedAdEventType, AdEventType } = gma;
  const ad = RewardedAd.createForAdRequest(units().rewarded);
  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewarded = ad;
    useAds.setState({ rewardedReady: true });
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    if (rewarded === ad || rewarded === null) setTimeout(loadRewarded, RETRY_MS);
  });
  ad.load();
}

function loadInterstitial(): void {
  if (!gma) return;
  const { InterstitialAd, AdEventType } = gma;
  const ad = InterstitialAd.createForAdRequest(units().interstitial);
  ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitial = ad;
    interstitialReady = true;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    if (!interstitialReady) setTimeout(loadInterstitial, RETRY_MS);
  });
  ad.load();
}

async function prepare(): Promise<void> {
  // Yerel modül bu derlemede var mı? Yoksa kütüphaneyi yüklemeye çalışmak bile
  // hata ekranı açar (eski geliştirme derlemesi): önce yoklanır.
  if (!TurboModuleRegistry.get('RNGoogleMobileAdsModule')) {
    fake = __DEV__;
    useAds.setState({ rewardedReady: fake });
    return;
  }
  let lib: Gma;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require('react-native-google-mobile-ads') as Gma;
    // 1) Rıza formu: yalnızca gereken bölgelerde (ör. AB) görünür.
    await lib.AdsConsent.gatherConsent().catch(() => undefined);
    // 2) iOS izleme izni. Reddedilirse reklamlar kişiselleştirilmeden gösterilir.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracking = require('expo-tracking-transparency') as typeof import('expo-tracking-transparency');
    await tracking.requestTrackingPermissionsAsync().catch(() => undefined);
    // 3) SDK.
    await lib.default().initialize();
  } catch {
    // SDK başlatılamadı: reklam yok, ona bağlı butonlar görünmez.
    return;
  }
  gma = lib;
  loadRewarded();
  loadInterstitial();
}

export const ads = {
  /**
   * İzinleri sorar, SDK'yı başlatır ve ilk reklamları yükler. Bir kez çalışır;
   * tekrar çağırmak zararsızdır. İlk açılışta değil, oyuncu birkaç bölüm
   * oynadıktan sonra çağrılır.
   */
  warmUp(): Promise<void> {
    warming ??= prepare();
    return warming;
  },

  /** Gösterilmeye hazır bir ödüllü video var mı? (Bileşenlerde `useRewardedReady` kullan.) */
  rewardedReady(): boolean {
    return useAds.getState().rewardedReady;
  },

  /**
   * Ödüllü videoyu gösterir. Oyuncu sonuna kadar izlediyse `true` döner;
   * kapattıysa ya da reklam gösterilemediyse `false`. Asla hata fırlatmaz.
   */
  showRewarded(): Promise<boolean> {
    if (fake) return new Promise((resolve) => setTimeout(() => resolve(true), FAKE_AD_MS));
    const ad = rewarded;
    if (!gma || !ad) return Promise.resolve(false);
    const { RewardedAdEventType, AdEventType } = gma;
    rewarded = null;
    useAds.setState({ rewardedReady: false });

    return new Promise<boolean>((resolve) => {
      let earned = false;
      const done = () => {
        resolve(earned);
        // Sıradaki video için önden yükle.
        loadRewarded();
      };
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      ad.addAdEventListener(AdEventType.CLOSED, done);
      ad.show().catch(done);
    });
  },

  /**
   * Bir macera bölümü bitti ve oyuncu devam ediyor. Kural tutuyorsa ve reklam
   * hazırsa araya giren reklamı gösterir; reklam kapanınca döner. Reklamsız
   * oyuncuya, ilk bölümlerde ve çok sık asla gösterilmez. Asla hata fırlatmaz.
   */
  afterLevel(levelNumber: number): Promise<void> {
    levelsSinceLast++;
    const show = shouldShowInterstitial({
      levelNumber,
      levelsSinceLast,
      msSinceLast: lastInterstitialAt === 0 ? Infinity : Date.now() - lastInterstitialAt,
      noAds: hasNoAds(useStore.getState().entitlements),
    });
    const ad = interstitial;
    if (!show || !gma || !ad || !interstitialReady) return Promise.resolve();
    const { AdEventType } = gma;
    interstitial = null;
    interstitialReady = false;
    levelsSinceLast = 0;
    lastInterstitialAt = Date.now();

    return new Promise<void>((resolve) => {
      const done = () => {
        resolve();
        loadInterstitial();
      };
      ad.addAdEventListener(AdEventType.CLOSED, done);
      ad.show().catch(done);
    });
  },
};

/** Ödüllü video hazır mı; hazır olunca bileşeni yeniden çizer. */
export function useRewardedReady(): boolean {
  return useAds((s) => s.rewardedReady);
}
