/**
 * Mağaza. Gerçek parayla: coin paketleri, başlangıç paketi (ilk 48 saat),
 * Kutup Işığı paketi ve reklamsız. Coinle: kostümler (gardıropta; burada her
 * gün değişen üç kostümlük bir vitrin var).
 *
 * Satılan her şey ya coin ya görünümdür; hiçbiri oyunda avantaj sağlamaz.
 * Fiyatlar App Store'dan oyuncunun para birimiyle gelir. Mağazaya
 * ulaşılamıyorsa satın alma butonları kapalıdır.
 */
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { CoinCounter, CoinIcon } from '@/components/hud/CoinCounter';
import { Penguin } from '@/components/penguin';
import type { Costume } from '@/components/penguin/types';
import { AppText, IconButton, PressableScale, Screen } from '@/components/ui';
import { cosmetics } from '@/data/cosmetics';
import { exclusivesOf, products, STARTER_WINDOW_MS, type Product, type ProductId } from '@/data/products';
import { dayIndex } from '@/game/daily';
import { useAvatar, useOwnedCosmetics } from '@/game/useAvatar';
import { useToday } from '@/game/useDaily';
import { useTranslation, type TranslationKey } from '@/i18n';
import { devFlags } from '@/services/devFlags';
import { haptics } from '@/services/haptics';
import { buy, restore, useStore } from '@/services/store';
import { useSettings } from '@/store/settings';
import { radii, shadows, spacing, useTheme } from '@/theme';

const HOUR_MS = 60 * 60 * 1000;
/** Bilgi notunun ekranda kalma süresi (ms). */
const NOTICE_MS = 2600;
/** Vitrindeki kostüm sayısı. */
const SHOWCASE = 3;

export default function ShopScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { prices, entitlements, simulated, ready } = useStore();
  const avatar = useAvatar();
  const owned = useOwnedCosmetics();
  const today = useToday();
  const firstRunAt = useSettings((s) => s.firstRunAt);
  /** Ekran açıldığı an: başlangıç paketinin kalan süresi buna göre hesaplanır. */
  const [openedAt] = useState(() => Date.now());
  /** Satın alması süren ürün (butonlar kapalı). */
  const [busy, setBusy] = useState<ProductId | 'restore' | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const purchase = async (id: ProductId) => {
    if (busy) return;
    setBusy(id);
    const result = await buy(id);
    setBusy(null);
    if (result.status === 'cancelled') return;
    if (result.status === 'purchased') haptics.success();
    else haptics.nope();
    setNotice(result.status === 'purchased' ? 'shop.thanks' : result.status === 'pending' ? 'shop.pending' : 'shop.failed');
  };

  const restoreAll = async () => {
    if (busy) return;
    setBusy('restore');
    const ok = await restore();
    setBusy(null);
    setNotice(ok ? 'shop.restored' : 'shop.restoreFailed');
  };

  const has = (id: ProductId) => entitlements.includes(id);
  const starterLeft = firstRunAt > 0 ? firstRunAt + STARTER_WINDOW_MS - openedAt : 0;
  const starter = products.find((p) => p.starter);
  const showStarter = !!starter && !has(starter.id) && starterLeft > 0;
  const coinPacks = products.filter((p) => p.kind === 'consumable');
  const aurora = products.find((p) => p.id === 'bundle.aurora')!;
  const noAds = products.find((p) => p.id === 'noads')!;
  // Reklamsız zaten başka bir paketle geldiyse ayrıca satılmaz.
  const adFree = products.some((p) => p.noAds && has(p.id));

  // Vitrin: coinle alınan, henüz sahip olunmayan kostümlerden her gün farklı üçü.
  const pool = cosmetics.filter((item) => !item.exclusive && !owned.has(item.id));
  const start = pool.length > 0 ? (dayIndex(today) * SHOWCASE) % pool.length : 0;
  const showcase = pool.length <= SHOWCASE ? pool : Array.from({ length: SHOWCASE }, (_, i) => pool[(start + i) % pool.length]!);

  /** Paketin içinden çıkan kostümü takmış penguen. */
  const wearing = (id: ProductId): Costume =>
    Object.fromEntries(exclusivesOf(id).map((item) => [item.slot, item.look])) as Costume;

  const card = (product: Product, art: ReactNode, wide = false) => (
    <ProductCard
      key={product.id}
      product={product}
      price={prices[product.id]}
      owned={product.kind === 'permanent' && (has(product.id) || (product.id === 'noads' && adFree))}
      busy={busy === product.id}
      disabled={busy !== null}
      wide={wide}
      art={art}
      onBuy={() => purchase(product.id)}
    />
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.side}>
          <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        </View>
        <AppText variant="heading" accessibilityRole="header">
          {t('shop.title')}
        </AppText>
        <View style={[styles.side, styles.right]}>
          <CoinCounter />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {simulated && !devFlags.quiet && (
          <View style={[styles.pill, { backgroundColor: colors.surfaceSunken }]}>
            <AppText variant="caption" muted>
              {t('shop.simulated')}
            </AppText>
          </View>
        )}
        {!ready && !simulated && (
          <AppText variant="caption" muted center>
            {t('shop.unavailable')}
          </AppText>
        )}

        {/* Başlangıç paketi: yalnızca ilk 48 saat, tek seferlik. */}
        {showStarter &&
          starter &&
          card(
            starter,
            <Penguin character={avatar.character} costume={wearing(starter.id)} mood="excited" size={84} interactive={false} />,
            true,
          )}
        {showStarter && (
          <AppText variant="caption" muted center>
            {t('shop.starterLeft', { h: Math.max(1, Math.ceil(starterLeft / HOUR_MS)) })}
          </AppText>
        )}

        <Section title={t('shop.coins')}>
          {coinPacks.map((product, i) => card(product, <CoinPile count={i + 1} />))}
        </Section>

        <Section title={t('shop.specials')}>
          {card(
            aurora,
            <Penguin character={avatar.character} costume={wearing(aurora.id)} mood="proud" size={84} interactive={false} />,
            true,
          )}
          {card(noAds, <SymbolView name="sparkles" size={44} weight="bold" tintColor={colors.primary} />, true)}
        </Section>

        {/* Günün vitrini: coinle alınan kostümler; dokununca gardıropta denenir. */}
        {showcase.length > 0 && (
          <Section title={t('shop.showcase')}>
            {showcase.map((item) => (
              <PressableScale
                key={item.id}
                accessibilityLabel={`${t(item.nameKey)}, ${item.price} ${t('home.coins')}`}
                onPress={() => router.push({ pathname: '/profile', params: { try: item.id } })}
                style={[styles.showcase, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}
              >
                <View pointerEvents="none">
                  <Penguin
                    character={avatar.character}
                    costume={{ [item.slot]: item.look }}
                    size={58}
                    interactive={false}
                  />
                </View>
                <AppText variant="caption" numberOfLines={1}>
                  {t(item.nameKey)}
                </AppText>
                <View style={styles.price}>
                  <CoinIcon size={14} />
                  <AppText variant="caption" muted>
                    {item.price}
                  </AppText>
                </View>
              </PressableScale>
            ))}
          </Section>
        )}
        <AppText variant="caption" muted center>
          {t('shop.showcaseHint')}
        </AppText>
        <PressableScale
          accessibilityLabel={t('profile.wardrobe')}
          onPress={() => router.push('/profile')}
          style={[styles.link, { backgroundColor: colors.surface }]}
        >
          <SymbolView name="tshirt.fill" size={20} weight="bold" tintColor={colors.primary} />
          <AppText variant="label">{t('profile.wardrobe')}</AppText>
        </PressableScale>

        <PressableScale
          accessibilityLabel={t('shop.restore')}
          disabled={busy !== null}
          onPress={restoreAll}
          style={[styles.link, { backgroundColor: colors.surface }, busy === 'restore' && styles.off]}
        >
          <SymbolView name="arrow.clockwise" size={18} weight="bold" tintColor={colors.text} />
          <AppText variant="label">{t('shop.restore')}</AppText>
        </PressableScale>

        <AppText variant="caption" muted center>
          {t('shop.fair')}
        </AppText>
      </ScrollView>

      {notice && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          pointerEvents="none"
          style={styles.noticeWrap}
        >
          <View style={[styles.notice, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}>
            <AppText variant="label" center>
              {t(notice)}
            </AppText>
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" muted>
        {title}
      </AppText>
      <View style={styles.cards}>{children}</View>
    </View>
  );
}

/** Coin paketi görseli: paket büyüdükçe coin yığını büyür. */
function CoinPile({ count }: { count: number }) {
  return (
    <View style={styles.pile}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -12, marginTop: i % 2 === 0 ? 0 : -10 }}>
          <CoinIcon size={34} />
        </View>
      ))}
    </View>
  );
}

/**
 * Bir mağaza ürünü: görsel, ad, içerik ve fiyat butonu. `wide` kartlar satırın
 * tamamını kaplar (paketler); diğerleri üçlü sıra hâlinde durur (coin paketleri).
 */
function ProductCard({
  product,
  price,
  owned,
  busy,
  disabled,
  wide,
  art,
  onBuy,
}: {
  product: Product;
  /** Mağazadan gelen fiyat; yoksa ürün satılamaz. */
  price?: string;
  owned: boolean;
  busy: boolean;
  disabled: boolean;
  wide: boolean;
  art: ReactNode;
  onBuy: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = t(product.nameKey);
  const body = t(product.bodyKey, { n: product.coins });
  const off = owned || !price || disabled;

  const button = (
    <View style={[styles.buy, { backgroundColor: owned ? colors.surfaceSunken : colors.primary }, busy && styles.off]}>
      {owned ? (
        <>
          <SymbolView name="checkmark.circle.fill" size={16} tintColor={colors.primary} />
          <AppText variant="label">{t('shop.owned')}</AppText>
        </>
      ) : (
        <AppText variant="label" color={colors.onPrimary}>
          {price ?? '—'}
        </AppText>
      )}
    </View>
  );

  return (
    <PressableScale
      accessibilityLabel={`${name}, ${body}, ${owned ? t('shop.owned') : (price ?? '')}`}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={onBuy}
      style={[
        styles.card,
        wide ? styles.wide : styles.narrow,
        shadows.soft(colors.shadow),
        { backgroundColor: colors.surface },
        !owned && !price && styles.off,
      ]}
    >
      {product.badgeKey && !owned && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <AppText variant="caption" color={colors.onAccent} style={styles.badgeText}>
            {t(product.badgeKey)}
          </AppText>
        </View>
      )}
      <View pointerEvents="none" style={wide ? styles.artWide : styles.art}>
        {art}
      </View>
      <View style={wide ? styles.textsWide : styles.texts}>
        <AppText variant={wide ? 'heading' : 'label'} center={!wide} numberOfLines={2}>
          {name}
        </AppText>
        <AppText variant="caption" muted center={!wide}>
          {body}
        </AppText>
        {wide && <View style={styles.buyWide}>{button}</View>}
      </View>
      {!wide && button}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  list: { gap: spacing.md, paddingTop: spacing.md, paddingHorizontal: spacing.xs, paddingBottom: spacing.lg },
  pill: { alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  section: { gap: spacing.sm },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { borderRadius: radii.md, padding: spacing.sm, gap: spacing.xs },
  narrow: { width: '31%', alignItems: 'center', paddingTop: spacing.lg },
  wide: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  art: { height: 56, alignItems: 'center', justifyContent: 'center' },
  artWide: { width: 88, alignItems: 'center', justifyContent: 'center' },
  texts: { alignItems: 'center', gap: 2, minHeight: 58 },
  textsWide: { flex: 1, gap: 4 },
  pile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buy: {
    alignSelf: 'stretch',
    minHeight: 36,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  buyWide: { alignSelf: 'flex-start', marginTop: spacing.xs, minWidth: 110 },
  badge: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    right: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    zIndex: 1,
  },
  badgeText: { fontSize: 11, lineHeight: 14 },
  showcase: {
    width: '31%',
    borderRadius: radii.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  price: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radii.pill,
  },
  off: { opacity: 0.45 },
  noticeWrap: { position: 'absolute', left: 0, right: 0, bottom: 48, alignItems: 'center' },
  notice: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.pill, maxWidth: 340 },
});
