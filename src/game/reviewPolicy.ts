/**
 * Puanlama isteğinin kuralı (saf hesap).
 *
 * Apple'ın penceresi yalnızca oyuncunun keyfi yerindeyken istenir: belli bir
 * bölümden sonra, üç yıldızlı bir bitirişin ardından. Toplamda en çok
 * `REVIEW_MILESTONES.length` kez; aynı oyuncuya yılda kaç kez gösterileceğine
 * zaten Apple karar verir.
 */

/** n. istek en erken bu bölüm numarasında yapılır. */
export const REVIEW_MILESTONES = [12, 40] as const;

export interface ReviewContext {
  /** Az önce bitirilen macera bölümünün numarası. */
  levelNumber: number;
  /** Bu bitirişin yıldız sayısı. */
  stars: number;
  /** Şimdiye kadar yapılan istek sayısı. */
  asked: number;
}

export function shouldAskForReview({ levelNumber, stars, asked }: ReviewContext): boolean {
  const milestone = REVIEW_MILESTONES[asked];
  if (milestone === undefined) return false;
  return stars === 3 && levelNumber >= milestone;
}
