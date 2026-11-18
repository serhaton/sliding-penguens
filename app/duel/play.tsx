/**
 * Düello ekranı. Tahta ortada; iki oyuncunun bilgi şeritleri karşılıklı.
 * Yüz yüze oyunda üstteki şerit ters durur.
 *
 * Düello bir seridir: üç oyun kazanan alır. Her oyun bitince sonuç kartı açılır;
 * "Sonraki oyun" yeni bir tahtada, başlayan oyuncu değişerek başlar. Seri
 * bitince kart ana ekrana götürür.
 *
 *   /duel/play?mode=local                    aynı cihazda iki kişi
 *   /duel/play?mode=cpu&difficulty=medium    bilgisayara karşı
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { Difficulty } from '@/ai';
import { Board } from '@/components/board';
import { DuelComplete } from '@/components/duel/DuelComplete';
import { PlayerBar } from '@/components/duel/PlayerBar';
import { AppText, IconButton, Screen } from '@/components/ui';
import { duelBoardAt, duelTeamColors } from '@/data/duel';
import { wallet } from '@/economy/wallet';
import type { LevelDef, TeamId } from '@/engine';
import {
  addGame,
  CPU_TEAM,
  homeCount,
  HUMAN_TEAM,
  movesLeft,
  otherTeam,
  outcomeFor,
  seriesWinner,
  teamSize,
  type SeriesScore,
} from '@/game/duel';
import { useDuelSession } from '@/game/useDuelSession';
import { useTranslation } from '@/i18n';
import { audio } from '@/services/audio';
import { todayKey } from '@/services/clock';
import { withoutScarf } from '@/game/avatar';
import { useAvatar } from '@/game/useAvatar';
import { useSettings } from '@/store/settings';
import { radii, s, shadows, spacing, useTheme } from '@/theme';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

let matchCounter = 0;
/** Düello (seri) kimliği: aynı düellonun istatistiği iki kez sayılmasın diye. */
function newMatchId(): string {
  matchCounter += 1;
  return `${Date.now()}-${matchCounter}`;
}

export default function DuelPlayRoute() {
  const { mode, difficulty, demo } = useLocalSearchParams<{ mode?: string; difficulty?: string; demo?: string }>();
  const cpu = mode === 'cpu' ? (DIFFICULTIES.find((d) => d === difficulty) ?? 'easy') : null;

  /** Serinin kaçıncı oyunu, kim başlıyor ve şu ana kadarki seri skoru. */
  const [match, setMatch] = useState<{ n: number; starter: TeamId; score: SeriesScore }>({
    n: 0,
    starter: HUMAN_TEAM,
    score: [0, 0],
  });
  /** Ekran açılırken sıradaki tahtanın numarası: her maçta farklı tahta gelir. */
  const [firstBoard] = useState(() => useSettings.getState().duelMatches);
  const countDuelMatch = useSettings((s) => s.countDuelMatch);

  useEffect(() => {
    countDuelMatch();
  }, [match.n, countDuelMatch]);

  return (
    <DuelMatch
      // key: yeni maçta oturum (durum, zamanlayıcılar) sıfırdan kurulsun.
      key={match.n}
      board={duelBoardAt(firstBoard + match.n)}
      cpu={cpu}
      starter={match.starter}
      score={match.score}
      // Yalnızca geliştirme: iki tarafı da bilgisayar oynar (ekranı dokunmadan izlemek için).
      demo={__DEV__ && demo === '1'}
      onNext={(score) => setMatch((m) => ({ n: m.n + 1, starter: otherTeam(m.starter), score }))}
    />
  );
}

function DuelMatch({
  board,
  cpu,
  starter,
  score,
  demo,
  onNext,
}: {
  board: LevelDef;
  cpu: Difficulty | null;
  starter: TeamId;
  /** Bu oyundan önceki seri skoru. */
  score: SeriesScore;
  demo: boolean;
  /** Sonraki oyuna geç (yeni seri skoruyla). */
  onNext: (score: SeriesScore) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const largeSymbols = useSettings((s) => s.largeSymbols);
  // Düelloda atkı takım rengini taşır: özel atkı takılmaz, gerisi (şapka, saç, gözlük) kalır.
  const profile = useAvatar();
  const avatar = useMemo(() => withoutScarf(profile), [profile]);
  const session = useDuelSession(board, { cpu, starter, demo: demo ? 'hard' : null });
  const { state } = session;

  const [area, setArea] = useState({ width: 0, height: 0 });
  /** Sonuç kartı son animasyon (dans) bitince açılır. */
  const [showResult, setShowResult] = useState(false);
  /** Bu maçla kazanılan coin. */
  const [coins, setCoins] = useState(0);
  const [matchId] = useState(newMatchId);

  useEffect(() => audio.preload(), []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  // Bu oyun bittiyse seri skoru ve (bittiyse) seriyi kazanan.
  const after = state.result ? addGame(score, state.result.winner) : score;
  const champion = seriesWinner(after);

  /**
   * Oyun bitti. Seri de bittiyse ve bilgisayara karşıysa istatistik ve ödüller
   * cüzdana yazılır: ödül tek oyuna değil, kazanılan düelloya (seriye) verilir.
   */
  const finish = () => {
    setShowResult(true);
    if (!cpu || demo || champion === null) return;
    const outcome = champion === HUMAN_TEAM ? 'win' : 'loss';
    void (async () => {
      await wallet().recordDuelResult(matchId, outcome);
      if (outcome !== 'win') return;
      // Liderlik tablosu: zor bilgisayara karşı kazanılan düellolar.
      if (cpu === 'hard') useSettings.getState().bump('hardCpuWins');
      // Bu zorlukta ilk galibiyet ödülü + günün ödüllü galibiyeti (günde sınırlı).
      const first = await wallet().claimCpuFirstWin(cpu);
      const daily = await wallet().claimDailyDuelWin(todayKey());
      setCoins(first + daily);
    })();
  };

  const names: Record<TeamId, string> = cpu
    ? { [HUMAN_TEAM]: t('duel.you'), [CPU_TEAM]: t('duel.cpu') }
    : { 0: t('duel.blue'), 1: t('duel.orange') };

  /** Oyuncunun şeridindeki kısa not. */
  const noteFor = (team: TeamId): string | undefined => {
    if (state.result) return undefined;
    // Son olay: pas ya da yerinde dönme (sıra karşıya geçtikten sonra görünür).
    if (session.note?.team === team && state.turn !== team) {
      return t(session.note.kind === 'pass' ? 'duel.pass' : 'duel.spun');
    }
    if (state.turn !== team) return undefined;
    return cpu && team === CPU_TEAM ? t('duel.thinking') : t('duel.yourTurn');
  };

  const bar = (team: TeamId) => (
    <PlayerBar
      name={names[team]!}
      color={duelTeamColors[team]!}
      home={homeCount(state, team)}
      total={teamSize(state, team)}
      wins={after[team]}
      active={!state.result && state.turn === team}
      note={noteFor(team)}
      // Yüz yüze oyunda üstteki oyuncu karşıda oturur.
      flipped={!cpu && team === 1}
      canReact={!(cpu && team === CPU_TEAM)}
      // Alttaki oyuncu cihazın sahibidir: profil penguenini kostümleriyle taşır.
      avatar={team === HUMAN_TEAM ? avatar : undefined}
    />
  );

  const outcome = outcomeFor(state, HUMAN_TEAM);
  const winner = state.result?.winner ?? null;
  // Başlık: seri bittiyse düelloyu kimin kazandığı, yoksa bu oyunun sonucu.
  const title = !state.result
    ? ''
    : champion !== null
      ? cpu
        ? t(champion === HUMAN_TEAM ? 'duel.seriesWin' : 'duel.seriesLose')
        : t('duel.seriesWinner', { name: names[champion]! })
      : winner === null
        ? t('duel.draw')
        : cpu
          ? t(outcome === 'win' ? 'duel.win' : 'duel.lose')
          : t('duel.winner', { name: names[winner]! });
  const left = movesLeft(state);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        {left !== null && (
          <View style={[styles.moves, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}>
            <AppText variant="label" color={left <= 6 ? colors.accentDark : colors.text}>
              {t('duel.movesLeft', { n: left })}
            </AppText>
          </View>
        )}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.top}>{bar(1)}</View>

      <View style={styles.boardArea} onLayout={onLayout}>
        {area.width > 0 && (
          <Board
            level={board}
            state={state}
            signal={session.signal}
            maxWidth={area.width}
            maxHeight={area.height}
            largeSymbols={largeSymbols}
            celebrate
            // Yüz yüze oyunda sıra üstteki oyuncudayken çizimler ona döner.
            flipped={!cpu && state.turn === 1}
            // Cihaz sahibinin takımı profil pengueniyle oynar (bilgisayara karşı da, yüz yüze de).
            teamLooks={{ [HUMAN_TEAM]: avatar }}
            onTapPenguin={session.tap}
            onFinished={finish}
          />
        )}
      </View>

      {bar(0)}

      {showResult && state.result && (
        <DuelComplete
          title={title}
          series={after}
          gameScore={[homeCount(state, 0), homeCount(state, 1)]}
          colors={[duelTeamColors[0]!, duelTeamColors[1]!]}
          winnerColor={winner === null ? undefined : duelTeamColors[winner]}
          coins={coins}
          finished={champion !== null}
          faceToFace={!cpu}
          onNext={() => onNext(after)}
          onHome={() => router.dismissTo('/')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: s(48) },
  moves: {
    minHeight: s(36),
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  top: { marginTop: spacing.sm },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm },
});
