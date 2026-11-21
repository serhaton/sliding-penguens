/**
 * Ana ekran. Tek odak: "Oyna". Altında "Düello", köşelerde dört küçük ikon.
 *
 * "Oyna" kaldığın bölümü açar; alttaki harita ikonu bütün yolu gösterir.
 * Başlığın üstündeki penguen dokununca zıplar.
 *
 * İlk açılışta menü gösterilmez: oyuncu doğrudan 1. bölüme düşer, oynamayı
 * oynayarak öğrenir. Geri dönünce bu ekranı görür.
 */
import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CoinCounter } from '@/components/hud/CoinCounter';
import { LoginReward } from '@/components/hud/LoginReward';
import { Penguin, PenguinAvatar } from '@/components/penguin';
import { AppText, BigButton, IconButton, PressableScale, Screen, Wordmark } from '@/components/ui';
import { antarctica } from '@/data/continents';
import { wallet } from '@/economy/wallet';
import { useProgress } from '@/game/progress';
import { useAvatar } from '@/game/useAvatar';
import { useDaily } from '@/game/useDaily';
import { useTranslation } from '@/i18n';
import { ads } from '@/services/ads';
import { adsConfig } from '@/services/ads.config';
import { devFlags } from '@/services/devFlags';
import { gameCenter } from '@/services/gameCenter';
import { useSettings } from '@/store/settings';
import { hitTarget, isTablet, radii, s, shadows, spacing, useTheme } from '@/theme';

/**
 * Günlük hediye kartı bu oturumda kapatıldı mı? Oturumda en fazla bir pop-up
 * kuralı: ana ekrana her dönüşte yeniden açılmaz.
 */
let giftDismissed = false;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const daily = useDaily();
  const avatar = useAvatar();
  const [giftOpen, setGiftOpen] = useState(!giftDismissed);
  const progress = useProgress();
  const firstRunDone = useSettings((s) => s.firstRunDone);
  const markFirstRunDone = useSettings((s) => s.markFirstRunDone);

    const play = () => router.push({ pathname: '/level/[id]', params: { id: progress.currentId } });

  // İlk açılış: doğrudan 1. bölüm. Bir kez yapılır; ilerlemesi olan oyuncuya
  // (ör. iCloud'dan geri yüklenen) hiç yapılmaz.
  useEffect(() => {
    if (firstRunDone) return;
    markFirstRunDone();
    if (progress.fresh) router.push({ pathname: '/level/[id]', params: { id: progress.currentId } });
  }, [firstRunDone, markFirstRunDone, progress.fresh, progress.currentId]);

  // Günlük hediye kartı şu an ekranda mı?
  const giftShowing = giftOpen && firstRunDone && !progress.fresh && !daily.login.claimed;

  // Sistem pencereleri sırayla ve hediye kartı kapandıktan sonra açılır; üst üste
  // binmezler. İkisi de ilk açılış karşılamasında sorulmaz:
  //  1) Game Center girişi (oyuncu oynamaya başladıktan sonra),
  //  2) reklam izinleri ve ilk yükleme (birkaç bölüm oynandıktan sonra).
  const adsDue = progress.currentNumber > adsConfig.startAfterLevel;
  useEffect(() => {
    if (giftShowing || progress.fresh || devFlags.quiet) return;
    void gameCenter.signIn().then(() => {
      if (adsDue) void ads.warmUp();
    });
  }, [giftShowing, progress.fresh, adsDue]);

  return (
    <Screen>
      {/* Üst köşeler */}
      <View style={styles.cornerRow}>
        {/* Günlük sayfası (bulmaca + şans çarkı): rozet seriyi gösterir; bugün yapılacak bir şey varsa ikon vurgulu. */}
        <IconButton
          icon={daily.streak > 0 ? 'flame.fill' : 'calendar'}
          label={`${t('home.daily')}${daily.streak > 0 ? `, ${t('daily.streak', { n: daily.streak })}` : ''}`}
          badge={daily.streak > 0 ? daily.streak : undefined}
          tint={daily.solved && !daily.wheel.freeAvailable ? undefined : colors.accent}
          onPress={() => router.push('/daily')}
        />
        <CoinCounter />
        <IconButton
          icon="gearshape.fill"
          label={t('home.settings')}
          onPress={() => router.push('/settings')}
        />
      </View>

      {/* Penguen + başlık */}
      <View style={styles.hero}>
        {/* Profilde seçilen penguen, kostümleriyle. */}
        <Penguin character={avatar.character} costume={avatar.costume} size={isTablet ? s(300) : 190} label={t('app.name')} />
        <Wordmark text={t('app.name')} accessibilityRole="header" />
      </View>

      {/* Ana eylemler: başparmağın rahat ulaştığı alt bölge */}
      <View style={styles.actions}>
        <BigButton
          title={t('home.play')}
          // Kıta + bölüm: oyuncu hangi kıtada, kaçıncı bölümde kaldığını görür.
          subtitle={`${t(antarctica.titleKey)} · ${t('home.level', { n: progress.currentNumber })}`}
          icon="play.fill"
          onPress={play}
        />
        <BigButton
          title={t('home.duel')}
          icon="person.2.fill"
          tone="accent"
          size="medium"
          onPress={() => router.push('/duel')}
        />
      </View>

      {/* Alt gezinme: telefonda üç küçük ikon, iPad'de ekranı boydan boya kaplayan etiketli kartlar. */}
      {isTablet ? (
        <View style={styles.tiles}>
          <NavTile
            icon="person.crop.circle.fill"
            art={<PenguinAvatar size={s(44)} character={avatar.character} costume={avatar.costume} />}
            label={t('home.profile')}
            onPress={() => router.push('/profile')}
          />
          <NavTile icon="map.fill" label={t('home.map')} onPress={() => router.push('/map')} />
          <NavTile icon="bag.fill" label={t('home.shop')} onPress={() => router.push('/shop')} />
        </View>
      ) : (
        <View style={styles.cornerRow}>
          <IconButton
            icon="person.crop.circle.fill"
            label={t('home.profile')}
            onPress={() => router.push('/profile')}
          >
            {/* Profil butonu: soyut ikon yerine oyuncunun kendi pengueni. */}
            <PenguinAvatar size={hitTarget - 6} character={avatar.character} costume={avatar.costume} />
          </IconButton>
          <IconButton icon="map.fill" label={t('home.map')} onPress={() => router.push('/map')} />
          <IconButton
            icon="bag.fill"
            label={t('home.shop')}
            onPress={() => router.push('/shop')}
          />
        </View>
      )}

      {/* Günlük hediye: ilk açılış karşılamasında çıkmaz, oyuncu oynamaya başladıktan sonra gelir. */}
      {giftShowing && (
        <LoginReward
          status={daily.login}
          onClaim={() => wallet().claimLogin(daily.today, daily.login.day)}
          onClose={() => {
            giftDismissed = true;
            setGiftOpen(false);
          }}
        />
      )}
    </Screen>
  );
}

/** iPad alt gezinme kartı: büyük ikon ve altında adı. */
function NavTile({
  icon,
  art,
  label,
  onPress,
}: {
  icon: SFSymbol;
  /** İkonun yerine çizilecek içerik (profil kartında oyuncunun pengueni). */
  art?: ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.tile, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}
    >
      {art ?? <SymbolView name={icon} size={s(30)} weight="bold" tintColor={colors.primary} />}
      <AppText variant="label">{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cornerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    // iPad'de düğmeler ekran boyunca uzamaz: ortada, rahat basılır genişlikte.
    ...(isTablet && { width: '72%', alignSelf: 'center', paddingHorizontal: 0, marginBottom: spacing.xl }),
  },
  tiles: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  tile: {
    flex: 1,
    minHeight: s(84),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
