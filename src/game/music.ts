/**
 * Hangi bölümde hangi fon müziği çalar: her 10 bölümlük bölgenin kendi ezgisi
 * vardır. Günlük bulmaca gibi haritada yeri olmayan bölümlerde ilk bölgenin
 * ezgisi çalar.
 */
import { levelSections } from '@/data/levels';
import type { LevelDef } from '@/engine';
import type { MusicTrack } from '@/services/music';

/** Bölge (macera + harf) → ezgi. */
const REGION_TRACKS: Record<string, MusicTrack> = {
  '1A': 'shore',
  '1B': 'spin',
  '1C': 'waves',
  '2A': 'thin',
  '2B': 'pass',
  '2C': 'lake',
  '3A': 'valley',
  '3B': 'snore',
  '3C': 'dream',
};

export function musicTrackFor(level: LevelDef): MusicTrack {
  const section = levelSections.find((entry) => entry.levels.some((item) => item.id === level.id));
  return (section && REGION_TRACKS[`${section.episode}${section.key}`]) || 'shore';
}
