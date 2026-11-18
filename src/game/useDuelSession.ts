/**
 * Bir düello maçının oturumu: sıra, hamleler ve (varsa) bilgisayar rakip.
 *
 * Kurallar motorda, hamle seçimi yapay zekâda; bu kanca ikisini ekrana bağlar
 * ve tahtanın animasyonları için `BoardSignal` üretir (tek oyunculudaki ile aynı
 * sinyal, aynı tahta bileşeni).
 */
import { useCallback, useEffect, useState } from 'react';

import { chooseMove } from '@/ai';
import { applyMove, type GameState, type LevelDef, type TeamId } from '@/engine';
import { createRng, type Rng } from '@/generator/rng';
import { useSettings } from '@/store/settings';

import { CPU_TEAM, startDuel, type DuelSetup } from './duel';
import type { BoardSignal } from './useLevelSession';

/**
 * Bilgisayar, sıra kendisine geçtikten bu kadar sonra oynar (ms): önceki
 * hamlenin animasyonu bitsin ve oyuncu ne olduğunu görsün.
 */
const CPU_DELAY_MS = 1100;

let seedCounter = 0;
/** Her maça ayrı tohum: bilgisayar eşit hamleler arasında hep aynısını seçmesin. */
function newRng(): Rng {
  seedCounter += 1;
  return createRng(Date.now() + seedCounter * 7919);
}

export interface DuelSession {
  state: GameState;
  signal: BoardSignal;
  /** Sıradaki takım bilgisayar mı? (O sırada dokunuş alınmaz.) */
  cpuTurn: boolean;
  /**
   * Bilgi şeridinde kısa bir notla gösterilecek son olay; yoksa null.
   *  - pass: takımın hamlesi yoktu, sırası geçti.
   *  - spin: takım, önü kapalı bir penguenini yerinde döndürdü (geçerli bir
   *    hamle, ama tahtada az iz bırakır; not olmadan "bir şey yapmadı" sanılır).
   */
  note: { team: TeamId; kind: 'pass' | 'spin'; id: number } | null;
  tap: (penguinId: string) => void;
}

export function useDuelSession(board: LevelDef, setup: DuelSetup): DuelSession {
  const [state, setState] = useState(() => startDuel(board, setup.starter));
  const [signal, setSignal] = useState<BoardSignal>({ id: 0, kind: 'reset' });
  const [note, setNote] = useState<DuelSession['note']>(null);
  const [rng] = useState(newRng);

  const demo = setup.demo ?? null;
  // Sıradaki hamleyi bilgisayar mı yapacak ve hangi zorlukta?
  const cpuLevel = state.result ? null : (demo ?? (state.turn === CPU_TEAM ? setup.cpu : null));
  const cpuTurn = cpuLevel !== null;

  /** Hamleyi uygular; reddedilirse "hayır" animasyonu oynar. */
  const play = useCallback(
    (penguinId: string) => {
      const outcome = applyMove(state, { penguinId });
      if (!outcome.accepted) {
        const first = outcome.events[0];
        const reason = first?.type === 'rejected' ? first.reason : 'blocked';
        setSignal((s) => ({ id: s.id + 1, kind: 'reject', penguinId, reason }));
        return;
      }
      setState(outcome.state);
      setSignal((s) => ({ id: s.id + 1, kind: 'move', events: outcome.events }));
      const mover = state.turn;
      // Başarım sayacı: bilgisayarın pengueni bizim penguenimize çarpıp durdu (yolu kesildi).
      const blocked = outcome.events.some(
        (e) =>
          e.type === 'bump' &&
          e.obstacle.kind === 'penguin' &&
          state.penguins.find((p) => p.id === (e.obstacle as { penguinId: string }).penguinId)?.team !== mover,
      );
      if (blocked && setup.cpu && !setup.demo && mover === CPU_TEAM) useSettings.getState().bump('duelBlocks');
      const pass = outcome.events.find((e) => e.type === 'pass');
      const slid = outcome.events.some((e) => e.type === 'slide');
      setNote((n) => {
        const id = (n?.id ?? 0) + 1;
        if (pass?.type === 'pass') return { team: pass.team, kind: 'pass', id };
        return slid ? null : { team: mover, kind: 'spin', id };
      });
    },
    [state, setup.cpu, setup.demo],
  );

  // Oyuncu dokunuşu: bilgisayarın sırasında yok sayılır. Rakibin penguenine
  // dokunmak motorda reddedilir ve penguen "hayır" der.
  const tap = useCallback(
    (penguinId: string) => {
      if (state.result || cpuTurn) return;
      play(penguinId);
    },
    [state.result, cpuTurn, play],
  );

  // Bilgisayarın hamlesi.
  useEffect(() => {
    if (cpuLevel === null) return;
    const timer = setTimeout(() => {
      const move = chooseMove(state, cpuLevel, rng);
      if (move) play(move.penguinId);
    }, CPU_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cpuLevel, state, rng, play]);

  return { state, signal, cpuTurn, note, tap };
}
