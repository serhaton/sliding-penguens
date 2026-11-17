/** Takvim yardımcıları. Günlük ödüller oyuncunun yerel gününe göre sayılır. */

/** Bugünün yerel tarihi: YYYY-AA-GG. */
export function todayKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
