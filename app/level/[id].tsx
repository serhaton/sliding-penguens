/**
 * Bölüm ekranı. Tek odak: tahta. Üstte ince bilgi şeridi, altta üç ikon buton
 * (geri al, ipucu, baştan başla).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Board } from '@/components/board';
import { LevelComplete } from '@/components/hud/LevelComplete';
import { LevelHud } from '@/components/hud/LevelHud';
import { MechanicIntroCard } from '@/components/hud/MechanicIntroCard';
import { OfferSheet } from '@/components/hud/OfferSheet';
import { AppText, IconButton, Screen } from '@/components/ui';
import { getLevel, levelNumber, nextLevel } from '@/data/levels';
import { getMechanic } from '@/data/mechanics';
import type { CharacterId } from '@/data/characters';
import { wallet } from '@/economy/wallet';
import type { LevelDef } from '@/engine';
import { offers, payFor, type OfferKind, type PayMethod } from '@/game/offers';
import { useLevelSession } from '@/game/useLevelSession';
import { useTranslation } from '@/i18n';
import { ads } from '@/services/ads';
import { audio } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { radii, spacing, useTheme } from '@/theme';

export default function LevelRoute() {
  const { id, auto, autoNext, autoShare, offer } = useLocalSearchParams<{
    id: string;
    auto?: string;
    autoNext?: string;
    autoShare?: string;
    offer?: string;
  }>();
  const { t } = useTranslation();
  const level = getLevel(id);

  if (!level) {
    return (
      <Screen>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <View style={styles.center}>
          <AppText variant="title">{t('level.notFound')}</AppText>
        </View>
      </Screen>
    );
  }
  // key: bölüm değişince oturum (geçmiş, haklar) sıfırdan kurulsun.
  return (
    <LevelScreen
      key={level.id}
      level={level}
      autoplay={__DEV__ ? auto : undefined}
      autoNext={__DEV__ && autoNext === '1'}
      autoShare={__DEV__ && autoShare === '1'}
      initialOffer={__DEV__ && (offer === 'hint' || offer === 'undo') ? offer : null}
    />
  );
}

/**
 * `autoplay` (yalnızca geliştirme): virgülle ayrılmış penguen kimlikleri sırayla
 * oynatılır — animasyonları dokunmadan izlemek için.
 *   slidingpenguins://level/4?auto=limon,nane,nar,piti
 */
function LevelScreen({
  level,
  autoplay,
  autoNext = false,
  autoShare = false,
  initialOffer = null,
}: {
  level: LevelDef;
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

  // Bu bölüm yeni bir mekanik getiriyorsa ve tanıtımı henüz izlenmediyse göster.
  const mechanic = getMechanic(level.intro);
  const introSeen = useSettings((s) => !mechanic || s.seenIntros.includes(mechanic.id));
  const markIntroSeen = useSettings((s) => s.markIntroSeen);
  const showIntro = !!mechanic && !introSeen;
  const number = levelNumber(level.id);
  const next = nextLevel(level.id);

  /** Tahtaya ayrılan alan (yerleşimden ölçülür; iPad'de de sığsın diye). */
  const [area, setArea] = useState({ width: 0, height: 0 });
  /** Bitiş kartı son animasyon tamamlanınca açılır. */
  const [showComplete, setShowComplete] = useState(false);
  /** Bu bitirişle kazanılan coin (bölüm sonu sayacı ve "2 katı" için). */
  const [reward, setReward] = useState(0);
  /** Açık yardım teklifi (ipucu ya da geri alma): coin ya da video sorulur. */
  const [offer, setOffer] = useState<OfferKind | null>(initialOffer);

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
  const tutorial = number === 1 && session.moveCount === 0 && !session.finished;
  const firstMove = level.waveSolutions?.[0]?.[0] ?? level.solution?.[0] ?? null;
  const hintId = session.hintPenguinId ?? (tutorial ? firstMove : null);

  const nextId = next?.id;
  const goNext = useCallback(() => {
    if (nextId) router.replace({ pathname: '/level/[id]', params: { id: nextId } });
    else router.dismissTo('/');
  }, [nextId]);

  useEffect(() => {
    if (!autoNext || !showComplete) return;
    const timer = setTimeout(goNext, 1500);
    return () => clearTimeout(timer);
  }, [autoNext, showComplete, goNext]);

  /** "2 katı": video sonuna kadar izlendiyse kazanılan coin kadar daha verilir. */
  const doubleReward = async () => {
    if (!(await ads.showRewarded())) return false;
    // Kimlik bölüm + yıldıza bağlı: aynı ödül iki kez ikiye katlanamaz.
    return (await wallet().addAdBonus(`double:${level.id}:${session.stars}`, reward)) > 0;
  };

  // Geri al: ücretsiz hak varsa hemen; yoksa yeni hak teklif edilir.
  const onUndo = () => {
    if (session.undosLeft > 0) session.undo();
    else setOffer('undo');
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
    else session.buyUndos(offers.undo.amount);
    return true;
  };

  const restart = () => {
    setShowComplete(false);
    session.restart();
  };

  return (
    <Screen>
      <LevelHud
        levelNumber={number}
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
              setReward(wallet().previewLevelReward(level.id, session.stars));
              void wallet().recordLevelResult(level.id, session.stars);
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
          size={64}
          disabled={!session.canUndo}
          tint={session.stuck ? colors.accent : undefined}
          onPress={onUndo}
        />
        <IconButton
          icon="lightbulb.fill"
          label={t('level.hint')}
          size={64}
          disabled={session.finished || session.betweenWaves}
          onPress={onHint}
        />
        <IconButton
          icon="arrow.counterclockwise"
          label={t('level.restart')}
          size={64}
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
          videoReady={ads.rewardedReady()}
          onPay={payOffer}
          onClose={() => setOffer(null)}
        />
      )}

      {showComplete && (
        <LevelComplete
          levelNumber={number}
          stars={session.stars}
          moveCount={session.moveCount}
          coins={reward}
          character={level.penguins[0]?.character as CharacterId | undefined}
          hasNext={!!next}
          onReplay={restart}
          onNext={goNext}
          onDouble={ads.rewardedReady() ? doubleReward : undefined}
          autoShare={autoShare}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  notice: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
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
