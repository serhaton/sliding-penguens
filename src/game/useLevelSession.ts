/**
 * Bir bölümün oynanış oturumu: hamle geçmişi, geri alma hakkı, ipucu.
 *
 * Kurallar motorda; bu kanca yalnızca motoru ekrana bağlar. Her değişiklikte
 * tahtanın nasıl tepki vereceğini anlatan bir `BoardSignal` üretir: tahta
 * animasyonlarını bu sinyalden oynatır.
 */
import { useCallback, useMemo, useState } from 'react';

import { economy } from '@/economy/economy.config';
import {
  canUndo,
  createGame,
  createHistory,
  currentState,
  isStuck,
  playMove,
  restart as restartHistory,
  stageLevel,
  starsFor,
  undo as undoHistory,
  waveCount,
  type GameEvent,
  type GameState,
  type History,
  type LevelDef,
  type RejectReason,
  type Stars,
} from '@/engine';
import { getHint, solve } from '@/solver';

/** Hamle sonrası çıkmaz denetiminde gezilecek en fazla durum (cihazda birkaç ms). */
const DEAD_END_CHECK_STATES = 20_000;

export type BoardSignal =
  /**
   * Tahtayı durumdan baştan kur (ilk açılış, geri al, baştan başla).
   * `appear`: yeni dalga geldi; penguenler belirerek girsin.
   */
  | { id: number; kind: 'reset'; appear?: boolean }
  /** Kabul edilen hamle: olayları sırayla canlandır. */
  | { id: number; kind: 'move'; events: readonly GameEvent[] }
  /** Reddedilen dokunuş: "hayır" animasyonu. */
  | { id: number; kind: 'reject'; penguinId: string; reason: RejectReason };

export interface LevelSession {
  state: GameState;
  signal: BoardSignal;
  moveCount: number;
  par: number;
  /** Şu anki hamle sayısıyla alınacak yıldız. */
  stars: Stars;
  /** Kalan geri alma hakkı. 0 ise geri almak için yeni hak gerekir (`buyUndos`). */
  undosLeft: number;
  /** Geri alınacak bir hamle var (hak kalmamış olsa da). */
  canUndo: boolean;
  /** Hiçbir penguen kıpırdayamıyor ya da buradan çözüm yok. */
  stuck: boolean;
  finished: boolean;
  /** Şu anki dalga (0'dan başlar) ve toplam dalga sayısı. */
  wave: number;
  waves: number;
  /** Dalga bitti, sıradaki bekleniyor (bu sırada dokunuş alınmaz). */
  betweenWaves: boolean;
  /** Sıradaki dalgaya geç (tahta, dalga sonu animasyonu bitince çağırır). */
  nextWave: () => void;
  /** İpucuyla işaretlenen penguen. */
  hintPenguinId: string | null;
  tap: (penguinId: string) => void;
  /** Bir hakkı kullanıp son hamleyi geri alır; hak yoksa hiçbir şey yapmaz. */
  undo: () => void;
  /** Yeni `count` hak ekler ve birini hemen kullanır (coin ya da videoyla alındıktan sonra). */
  buyUndos: (count: number) => void;
  restart: () => void;
  /**
   * İpucu var mı diye bakar, göstermez (ödeme sorulmadan önce).
   *  - 'move': gösterilecek bir hamle var.
   *  - 'deadEnd': buradan çözüm yok; "sıkıştın" uyarısı açılır, ücret alınmaz.
   *  - 'none': gösterilecek ipucu yok (bölüm bitti ya da bilinmiyor).
   */
  checkHint: () => 'move' | 'deadEnd' | 'none';
  /** İpucunu gösterir: dokunulacak penguen parlar. */
  hint: () => void;
}

export function useLevelSession(level: LevelDef): LevelSession {
  const waves = waveCount(level);
  const [wave, setWave] = useState(0);
  /** Önceki dalgalarda yapılan toplam hamle. */
  const [earlierMoves, setEarlierMoves] = useState(0);
  const stage = useMemo(() => stageLevel(level, wave), [level, wave]);

  const [history, setHistory] = useState<History>(() => createHistory(createGame(stageLevel(level, 0))));
  const [signal, setSignal] = useState<BoardSignal>({ id: 0, kind: 'reset' });
  const [undosLeft, setUndosLeft] = useState<number>(economy.freeUndosPerLevel);
  const [hintPenguinId, setHintPenguinId] = useState<string | null>(null);
  /** İpucu "buradan çözüm yok" dediyse. */
  const [deadEnd, setDeadEnd] = useState(false);

  const state = currentState(history);
  const par = level.par ?? 0;
  const lastWave = wave === waves - 1;
  const waveDone = state.result !== null;
  const finished = waveDone && lastWave;
  const betweenWaves = waveDone && !lastWave;
  const moveCount = earlierMoves + state.moveCount;

  // "Çarpınca dön" kuralında penguenler asla tamamen sıkışmaz; çıkmaz, sonsuza
  // kadar dolaşıp yuvaya varamamak demektir ve oyuncu bunu göremez. Bu yüzden
  // her hamleden sonra "buradan hâlâ bitirilebilir mi" diye çözücüye sorulur.
  // (Sınır aşılırsa bilinmiyor sayılır: boş yere uyarı vermektense susmak iyi.)
  const unwinnable = useMemo(
    () =>
      state.rules.turnOnBump &&
      !state.result &&
      solve(state, { maxStates: DEAD_END_CHECK_STATES }).status === 'unsolvable',
    [state],
  );

  const tap = useCallback(
    (penguinId: string) => {
      if (waveDone) return;
      const outcome = playMove(history, { penguinId });
      const first = outcome.events[0];
      if (!outcome.accepted) {
        const reason = first?.type === 'rejected' ? first.reason : 'blocked';
        setSignal((s) => ({ id: s.id + 1, kind: 'reject', penguinId, reason }));
        return;
      }
      setHistory(outcome.history);
      setHintPenguinId(null);
      setSignal((s) => ({ id: s.id + 1, kind: 'move', events: outcome.events }));
    },
    [history, waveDone],
  );

  const nextWave = useCallback(() => {
    if (!betweenWaves) return;
    setEarlierMoves((n) => n + state.moveCount);
    setHistory(createHistory(createGame(stageLevel(level, wave + 1))));
    setWave(wave + 1);
    setHintPenguinId(null);
    setDeadEnd(false);
    setSignal((s) => ({ id: s.id + 1, kind: 'reset', appear: true }));
  }, [betweenWaves, state.moveCount, level, wave]);

  // Geri al ve baştan başla yalnızca içinde bulunulan dalgayı etkiler.
  const undo = useCallback(() => {
    if (!canUndo(history) || undosLeft <= 0 || waveDone) return;
    setHistory(undoHistory(history));
    setUndosLeft((n) => n - 1);
    setHintPenguinId(null);
    setDeadEnd(false);
    setSignal((s) => ({ id: s.id + 1, kind: 'reset' }));
  }, [history, undosLeft, waveDone]);

  const restart = useCallback(() => {
    setHistory(restartHistory(history));
    setUndosLeft(economy.freeUndosPerLevel);
    setHintPenguinId(null);
    setDeadEnd(false);
    setSignal((s) => ({ id: s.id + 1, kind: 'reset' }));
  }, [history]);

  const buyUndos = useCallback(
    (count: number) => {
      if (!canUndo(history) || waveDone || count <= 0) return;
      setHistory(undoHistory(history));
      setUndosLeft(count - 1);
      setHintPenguinId(null);
      setDeadEnd(false);
      setSignal((s) => ({ id: s.id + 1, kind: 'reset' }));
    },
    [history, waveDone],
  );

  const checkHint = useCallback((): 'move' | 'deadEnd' | 'none' => {
    const result = getHint({ state, solution: stage.solution, played: history.moves });
    if (result.kind === 'move') return 'move';
    if (result.kind === 'deadEnd') {
      setDeadEnd(true);
      return 'deadEnd';
    }
    return 'none';
  }, [state, stage.solution, history.moves]);

  const hint = useCallback(() => {
    const result = getHint({ state, solution: stage.solution, played: history.moves });
    if (result.kind === 'move') setHintPenguinId(result.penguinId);
    else if (result.kind === 'deadEnd') setDeadEnd(true);
  }, [state, stage.solution, history.moves]);

  return {
    state,
    signal,
    moveCount,
    par,
    stars: starsFor(moveCount, par),
    undosLeft,
    canUndo: canUndo(history) && !waveDone,
    stuck: !waveDone && (deadEnd || unwinnable || isStuck(state)),
    finished,
    wave,
    waves,
    betweenWaves,
    nextWave,
    hintPenguinId,
    tap,
    undo,
    buyUndos,
    restart,
    checkHint,
    hint,
  };
}
