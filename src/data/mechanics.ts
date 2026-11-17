/**
 * Mekanik tanıtımları. Yeni bir kural ilk kez geldiğinde, o bölümden önce kısa
 * ve yazısız bir gösterim oynar: küçük bir tahtada gerçek motor ve gerçek
 * animasyonlarla, kuralı gösteren birkaç hamle döngü hâlinde tekrarlanır.
 *
 * Yeni bir mekanik eklemek için: buraya bir gösterim bölümü ve hamle dizisi
 * yaz, sonra o mekaniğin ilk bölümüne `intro` olarak ver (data/levels/index.ts).
 */
import type { LevelDef } from '@/engine';
import type { TranslationKey } from '@/i18n';

export type MechanicId = 'turn' | 'waves';

export interface MechanicIntro {
  id: MechanicId;
  /** Kısa başlık (iki üç kelime). Anlatımı animasyon yapar. */
  titleKey: TranslationKey;
  /** Gösterim tahtası. */
  demo: LevelDef;
  /** Sırayla dokunulacak penguenler. */
  script: string[];
}

export const mechanics: Record<MechanicId, MechanicIntro> = {
  // Çarpınca dön: kayaya çarpar, aşağı döner, yuvasına iner.
  turn: {
    id: 'turn',
    titleKey: 'intro.turn',
    demo: {
      id: 'intro-turn',
      rules: { turnOnBump: true },
      grid: ['....', '...#', '....', '....'],
      penguins: [{ id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 1 }],
      igloos: [{ color: 'blue', x: 2, y: 3 }],
    },
    script: ['piti', 'piti'],
  },

  // Dalgalar: biri yuvaya girince yenisi gelir.
  waves: {
    id: 'waves',
    titleKey: 'intro.waves',
    demo: {
      id: 'intro-waves',
      grid: ['....', '....', '....'],
      penguins: [{ id: 'piti', character: 'piti', color: 'blue', dir: 'right', x: 0, y: 1 }],
      igloos: [
        { color: 'blue', x: 3, y: 1 },
        { color: 'red', x: 1, y: 0 },
      ],
      waves: [[{ id: 'nar', character: 'nar', color: 'red', dir: 'up', x: 1, y: 2 }]],
    },
    script: ['piti', 'nar'],
  },
};

export function getMechanic(id: string | undefined): MechanicIntro | undefined {
  return id ? mechanics[id as MechanicId] : undefined;
}
