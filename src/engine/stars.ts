/**
 * Yıldız kuralı: en az hamlede (par) 3 yıldız, küçük bir payla 2, fazlasında 1.
 *
 * Pay bölümün uzunluğuyla orantılıdır: kısa bölümde 2 hamle, uzun (dalgalı)
 * bölümlerde par'ın %15'i. Sabit "+2" kısa bölüm için makuldür ama 40 hamlelik
 * bir bölümde neredeyse hiç hata payı bırakmaz.
 */
export type Stars = 1 | 2 | 3;

/** 2 yıldız için par'ın üstüne tanınan hamle payı. */
export function twoStarSlack(par: number): number {
  return Math.max(2, Math.ceil(par * 0.15));
}

export function starsFor(moveCount: number, par: number): Stars {
  if (moveCount <= par) return 3;
  if (moveCount <= par + twoStarSlack(par)) return 2;
  return 1;
}

/** Yıldız göstergesi için: bu yıldızı korumak için en fazla kaç hamle yapılabilir. */
export function moveBudgetFor(stars: 2 | 3, par: number): number {
  return stars === 3 ? par : par + twoStarSlack(par);
}
