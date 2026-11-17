/**
 * Zorluk eğrisine göre bölüm seçimi: her bölüm yuvası (slot) için koşulları
 * sağlayan adaylar üretilir, zorluk puanına göre sıralanır ve yuvanın hedef
 * dilimine en yakın, daha önce seçilenlere benzemeyen aday alınır.
 */
import type { LevelDef } from '@/engine';

import { generateCandidate, type GenParams } from './generate';
import { measure, type Metrics } from './metrics';
import type { Rng } from './rng';
import { similarity } from './similarity';

type Range = readonly [min: number, max: number];

export interface Slot {
  /** Bölüm numarası (1'den başlar). */
  level: number;
  /** Bölüm kimliği; verilmezse numaranın kendisi. */
  id?: string;
  /** En iyi çözümde en az kaç "penguene çarpıp durma" olsun. */
  minTeamwork?: number;
  /** En iyi çözümde en fazla kaç yerinde dönme olsun. */
  maxSpins?: number;
  /** Bu yuvanın havuzu için aday sayısı (verilmezse genel ayar). */
  candidates?: number;
  /** Ölçümde gezilecek en fazla durum (verilmezse ölçümün varsayılanı). */
  maxStates?: number;
  gen: GenParams;
  par: Range;
  blocked: Range;
  extraTaps: Range;
  /** Çıkmaz (kilitlenme tuzağı) serbest mi? */
  allowDeadEnds: boolean;
  /**
   * Koşulları sağlayan adaylar arasında hangi zorluk dilimi seçilsin
   * (0 = en kolayı, 1 = en zoru).
   */
  pick: number;
  /** Açıklama (rapor için). */
  note?: string;
}

export interface Selected {
  slot: Slot;
  level: LevelDef;
  metrics: Metrics;
  /** Bu yuva için üretilen ve koşulları sağlayan aday sayısı. */
  matched: number;
  tried: number;
}

const within = (value: number, [min, max]: Range) => value >= min && value <= max;

export interface SelectOptions {
  /** Yuva başına üretilecek aday sayısı. */
  candidatesPerSlot: number;
  /** Bu orandan fazla benzeyen aday elenir. */
  maxSimilarity: number;
}

export function selectLevels(
  rng: Rng,
  slots: readonly Slot[],
  already: readonly LevelDef[],
  options: SelectOptions,
): { selected: Selected[]; missing: Slot[] } {
  const chosen: LevelDef[] = [...already];
  const selected: Selected[] = [];
  const missing: Slot[] = [];

  // Aynı üretim ayarını paylaşan yuvalar aynı aday havuzunu kullanır:
  // ölçüm pahalı olabildiği için adaylar bir kez üretilip ölçülür.
  const pools = new Map<string, { level: LevelDef; metrics: Metrics }[]>();
  const poolFor = ({ gen, candidates, maxStates }: Slot) => {
    const count = candidates ?? options.candidatesPerSlot;
    const key = JSON.stringify([gen, count, maxStates]);
    let all = pools.get(key);
    if (!all) {
      all = [];
      for (let i = 0; i < count; i++) {
        const candidate = generateCandidate(rng, gen);
        const metrics = candidate && measure(candidate, maxStates);
        if (candidate && metrics) all.push({ level: candidate, metrics });
      }
      pools.set(key, all);
    }
    return all;
  };

  for (const slot of slots) {
    const pool = poolFor(slot).filter(({ metrics }) => {
      if (!within(metrics.par, slot.par)) return false;
      if (!within(metrics.blocked, slot.blocked)) return false;
      if (!within(metrics.extraTaps, slot.extraTaps)) return false;
      if (metrics.teamwork < (slot.minTeamwork ?? 0)) return false;
      if (metrics.spins > (slot.maxSpins ?? Infinity)) return false;
      // Çıkmaz yasaksa, çıkmaz olmadığı kanıtlanmış olmalı (bilinmiyor = -1 de elenir).
      if (!slot.allowDeadEnds && metrics.deadEnds !== 0) return false;
      return true;
    });

    pool.sort((a, b) => a.metrics.difficulty - b.metrics.difficulty);
    // Hedef dilimden başlayıp dışa doğru, benzemeyen ilk adayı ara.
    const target = Math.round(slot.pick * (pool.length - 1));
    const order = pool
      .map((entry, index) => ({ entry, distance: Math.abs(index - target) }))
      .sort((a, b) => a.distance - b.distance);
    const hit = order.find(({ entry }) =>
      chosen.every((other) => similarity(entry.level, other) <= options.maxSimilarity),
    );

    if (!hit) {
      missing.push(slot);
      continue;
    }
    const level: LevelDef = {
      ...hit.entry.level,
      id: slot.id ?? String(slot.level),
      par: hit.entry.metrics.par,
      solution: hit.entry.metrics.solution,
    };
    chosen.push(level);
    selected.push({
      slot,
      level,
      metrics: hit.entry.metrics,
      matched: pool.length,
      tried: slot.candidates ?? options.candidatesPerSlot,
    });
  }
  return { selected, missing };
}
