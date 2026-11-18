/**
 * Bir bulmacanın oynandığı ekran gövdesi: üstte ince bilgi şeridi, ortada
 * tahta, altta üç ikon buton (geri al, ipucu, baştan başla), bitince sonuç
 * kartı. Macera bölümleri (app/level/[id]) ve günlük bulmaca (app/daily) aynı
 * gövdeyi kullanır; ödülün ne olduğunu ve sonra nereye gidileceğini çağıran söyler.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Board } from '@/components/board';
import { LevelComplete } from '@/components/hud/LevelComplete';
import { LevelHud } from '@/components/hud/LevelHud';
import { MechanicIntroCard } from '@/components/hud/MechanicIntroCard';
import { OfferSheet } from '@/components/hud/OfferSheet';
import { AppText, IconButton, Screen } from '@/components/ui';
import type { CharacterId } from '@/data/characters';
import { getMechanic } from '@/data/mechanics';
import { wallet } from '@/economy/wallet';
import type { LevelDef } from '@/engine';
import { offers, payFor, type OfferKind, type PayMethod } from '@/game/offers';
import { useLevelSession } from '@/game/useLevelSession';
import { useTranslation } from '@/i18n';
import { ads, useRewardedReady } from '@/services/ads';
import { audio } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { radii, s, spacing, useTheme } from '@/theme';

/**
 * `autoplay` (yalnızca geliştirme): virgülle ayrılmış penguen kimlikleri sırayla
 * oynatılır — animasyonları dokunmadan izlemek için.
 *   slidingpenguins://level/4?auto=limon,nane,nar,piti
 */
export function LevelPlay({
  level,
  title,
  tutorial: teach = false,
  rewardFor,
  onWin,
  winNote,
  hasNext,
  onNext,
  replayable = true,
  autoplay,
  autoNext = false,
  autoShare = false,
  initialOffer = null,
}: {
  level: LevelDef;
  /** Başlık: "Bölüm 7", "Günlük bulmaca". */
  title: string;
  /** Öğretici: ilk hamleden önce dokunulacak penguen parlar ve el işaret eder. */
  tutorial?: boolean;
  /** Bu bitirişin kazandıracağı coin (kayıttan ÖNCE sorulur). */
  rewardFor: (stars: number) => number;
  /** Bölüm bitti: ilerlemeyi ve ödülü cüzdana yaz. */
  onWin: (stars: number, info: { undoUsed: boolean }) => void;
  /** Bitiş kartında hamle sayısının altındaki kısa not (ör. günlük seri). */
  winNote?: (stars: number) => string | undefined;
  /** "Devam" var mı? Yoksa buton ana ekrana döner. */
  hasNext: boolean;
  onNext: () => void;
  /** Bitiş kartında "Tekrar oyna" olsun mu? (Günlük bulmacada yok.) */
  replayable?: boolean;
  autoplay?: string;
  /** Yalnızca geliştirme: bölüm sonu kartında "Devam"a kendiliğinden basar. */
  autoNext?: boolean;
  /** Yalnızca geliştirme: bölüm sonunda paylaşım menüsünü kendiliğinden açar. */
  autoShare?: boolean;
  /** Yalnızca geliştirme: ekran bu teklif açık olarak gelir. */
  initialOffer?: OfferKind | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const largeSymbols = useSettings((s) => s.largeSymbols);
  const session = useLevelSession(level);
  // Ödüllü video hazır mı: değilse ona bağlı butonlar hiç görünmez.
  const videoReady = useRewardedReady();

  // Bu bölüm yeni bir mekanik getiriyorsa ve tanıtımı henüz izlenmediyse göster.
  const mechanic = getMechanic(level.intro);
  const introSeen = useSettings((s) => !mechanic || s.seenIntros.includes(mechanic.id));
  const markIntroSeen = useSettings((s) => s.markIntroSeen);
  const showIntro = !!mechanic && !introSeen;

  /** Tahtaya ayrılan alan (yerleşimden ölçülür; iPad'de de sığsın diye). */
  const [area, setArea] = useState({ width: 0, height: 0 });
  /** Bitiş kartı son animasyon tamamlanınca açılır. */
  const [showComplete, setShowComplete] = useState(false);
  /** Bu bitirişle kazanılan coin (bölüm sonu sayacı ve "2 katı" için). */
  const [reward, setReward] = useState(0);
  /** Açık yardım teklifi (ipucu ya da geri alma): coin ya da video sorulur. */
  const [offer, setOffer] = useState<OfferKind | null>(initialOffer);
  /** Bu denemede geri al kullanıldı mı ("geri alsız bitir" başarımı için)? */
  const [undoUsed, setUndoUsed] = useState(false);

  useEffect(() => audio.preload(), []);

  const [autoQueue, setAutoQueue] = useState(() => (autoplay ? autoplay.split(',') : []));
  const { tap, betweenWaves } = session;
  useEffect(() => {
    const [head, ...rest] = autoQueue;
    // Dalga geçişinde ve tanıtım kartı açıkken bekle.
    if (!head || betweenWaves || showIntro) return;
    const timer = setTimeout(() => {
      tap(head);
      setAutoQueue(rest);
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoQueue, tap, betweenWaves, showIntro]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  // Öğretici: ilk bölümde, ilk hamleden önce dokunulacak penguen parlar.
  const tutorial = teach && session.moveCount === 0 && !session.finished;
  const firstMove = level.waveSolutions?.[0]?.[0] ?? level.solution?.[0] ?? null;
  const hintId = session.hintPenguinId ?? (tutorial ? firstMove : null);

  useEffect(() => {
    if (!autoNext || !showComplete) return;
    const timer = setTimeout(onNext, 1500);
    return () => clearTimeout(timer);
  }, [autoNext, showComplete, onNext]);

  /** "2 katı": video sonuna kadar izlendiyse kazanılan coin kadar daha verilir. */
  const doubleReward = async () => {
    if (!(await ads.showRewarded())) return false;
    // Kimlik bölüm + yıldıza bağlı: aynı ödül iki kez ikiye katlanamaz.
    return (await wallet().addAdBonus(`double:${level.id}:${session.stars}`, reward)) > 0;
  };

  // Geri al: ücretsiz hak varsa hemen; yoksa yeni hak teklif edilir.
  const onUndo = () => {
    if (session.undosLeft > 0) {
      setUndoUsed(true);
      session.undo();
    } else setOffer('undo');
  };

  // İpucu: önce gösterilecek bir hamle var mı diye bakılır. Çıkmazdaysa
  // "sıkıştın" uyarısı açılır ve ücret alınmaz; ipucu zaten açıksa tekrar sorulmaz.
  const onHint = () => {
    if (session.hintPenguinId) return;
    if (session.checkHint() === 'move') setOffer('hint');
  };

  /** Teklifin bedelini alır; ödeme tamamlanınca yardımı verir. */
  const payOffer = async (method: PayMethod) => {
    if (!offer) return false;
    const paid = await payFor(offers[offer], method, level.id);
    if (!paid) return false;
    if (offer === 'hint') session.hint();
    else {
      setUndoUsed(true);
      session.buyUndos(offers.undo.amount);
    }
    return true;
  };

  const restart = () => {
    setUndoUsed(false);
    setShowComplete(false);
    session.restart();
  };

  return (
    <Screen>
      <LevelHud
        title={title}
        moveCount={session.moveCount}
        par={session.par}
        stars={session.stars}
        wave={session.wave}
        waves={session.waves}
        onBack={() => router.back()}
      />

      <View style={styles.boardArea} onLayout={onLayout}>
        {area.width > 0 && (
          <Board
            level={level}
            state={session.state}
            signal={session.signal}
            maxWidth={area.width}
            maxHeight={area.height}
            hintPenguinId={hintId}
            showHand={tutorial}
            largeSymbols={largeSymbols}
            celebrate={session.finished}
            onTapPenguin={session.tap}
            onFinished={() => {
              // Dalga bittiyse sıradaki gelir; son dalgaysa bölüm sonu kartı açılır.
              if (session.betweenWaves) {
                session.nextWave();
                return;
              }
              // İlerleme ve coinler cüzdana yazılır (aynı bölüm tekrar coin vermez).
              // Kazanç önce hesaplanır: kayıttan sonra sorulsa 0 çıkardı.
              setReward(rewardFor(session.stars));
              onWin(session.stars, { undoUsed });
              setShowComplete(true);
            }}
          />
        )}
      </View>

      {/* Sıkışınca nazik bir yönlendirme: kaybetmek yok. */}
      <View style={styles.notice}>
        {session.stuck && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.noticePill, { backgroundColor: colors.surface }]}
          >
            <AppText variant="label" center>
              {t('level.stuck')}
            </AppText>
          </Animated.View>
        )}
      </View>

      <View style={styles.actions}>
        <IconButton
          icon="arrow.uturn.backward"
          label={t('level.undo')}
          // Hak bitince rozet "+" olur: dokununca yeni hak teklif edilir.
          badge={session.undosLeft > 0 ? session.undosLeft : '+'}
          size={s(64)}
          disabled={!session.canUndo}
          tint={session.stuck ? colors.accent : undefined}
          onPress={onUndo}
        />
        <IconButton
          icon="lightbulb.fill"
          label={t('level.hint')}
          size={s(64)}
          disabled={session.finished || session.betweenWaves}
          onPress={onHint}
        />
        <IconButton
          icon="arrow.counterclockwise"
          label={t('level.restart')}
          size={s(64)}
          tint={session.stuck ? colors.accent : undefined}
          onPress={restart}
        />
      </View>

      {showIntro && mechanic && (
        <MechanicIntroCard mechanic={mechanic} onDone={() => markIntroSeen(mechanic.id)} />
      )}

      {offer && (
        <OfferSheet
          offer={offers[offer]}
          videoReady={videoReady}
          onPay={payOffer}
          onClose={() => setOffer(null)}
        />
      )}

      {showComplete && (
        <LevelComplete
          title={title}
          note={winNote?.(session.stars)}
          stars={session.stars}
          moveCount={session.moveCount}
          coins={reward}
          character={level.penguins[0]?.character as CharacterId | undefined}
          hasNext={hasNext}
          onReplay={replayable ? restart : undefined}
          onNext={onNext}
          onDouble={videoReady ? doubleReward : undefined}
          autoShare={autoShare}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  notice: { minHeight: s(44), alignItems: 'center', justifyContent: 'center' },
  noticePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
