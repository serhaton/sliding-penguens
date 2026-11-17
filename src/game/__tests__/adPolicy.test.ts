/** Araya giren reklamın kuralı. */
import { adsConfig } from '@/services/ads.config';

import { shouldShowInterstitial } from '../adPolicy';

const { freeLevels, everyLevels, minGapMs } = adsConfig.interstitial;
const ok = { levelNumber: freeLevels + 5, levelsSinceLast: everyLevels, msSinceLast: Infinity, noAds: false };

describe('araya giren reklam', () => {
  it('koşullar tutunca gösterilir', () => {
    expect(shouldShowInterstitial(ok)).toBe(true);
  });

  it('reklamsız oyuncuya asla gösterilmez', () => {
    expect(shouldShowInterstitial({ ...ok, noAds: true })).toBe(false);
  });

  it('ilk bölümlerde gösterilmez', () => {
    expect(shouldShowInterstitial({ ...ok, levelNumber: freeLevels })).toBe(false);
    expect(shouldShowInterstitial({ ...ok, levelNumber: freeLevels + 1 })).toBe(true);
  });

  it('yeterince bölüm bitirilmeden gösterilmez', () => {
    expect(shouldShowInterstitial({ ...ok, levelsSinceLast: everyLevels - 1 })).toBe(false);
  });

  it('iki reklam arasında en az bekleme süresi geçmeli', () => {
    expect(shouldShowInterstitial({ ...ok, msSinceLast: minGapMs - 1 })).toBe(false);
    expect(shouldShowInterstitial({ ...ok, msSinceLast: minGapMs })).toBe(true);
  });

  it('gerçek birimler test birimlerinden farklı ve aynı yayıncıya ait', () => {
    expect(adsConfig.units.rewarded).not.toBe(adsConfig.testUnits.rewarded);
    expect(adsConfig.units.rewarded.split('/')[0]).toBe(adsConfig.units.interstitial.split('/')[0]);
  });
});
