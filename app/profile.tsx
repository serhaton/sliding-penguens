/**
 * Profil penguenim: oyuncunun avatarı. Üstte büyük penguen (canlı önizleme),
 * altında karakter seçimi ve kostümler, en altta istatistikler.
 *
 * Kostüm deneme: sahip olunmayan bir ürüne dokununca penguen onu dener ve
 * altta "Al" butonu çıkar; satın alınca takılır. Sahip olunan ürüne dokununca
 * hemen takılır, takılı ürüne dokununca çıkarılır. Karakterler ücretsizdir.
 * Bir mağaza paketine özel kostümler (hediye ikonlu) coinle alınmaz; "Al"
 * butonu mağazaya götürür.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CoinCounter, CoinIcon } from '@/components/hud/CoinCounter';
import { Penguin } from '@/components/penguin';
import { AppText, BigButton, IconButton, PressableScale, Screen } from '@/components/ui';
import { characterList, characters, type CharacterId } from '@/data/characters';
import { cosmetics, cosmeticSlots, getCosmetic, type Cosmetic, type CosmeticSlot } from '@/data/cosmetics';
import { useWallet, wallet } from '@/economy/wallet';
import { getProduct } from '@/data/products';
import { economy } from '@/economy/economy.config';
import { achievementIds, achievementTitleKey } from '@/game/achievements';
import { avatarFrom } from '@/game/avatar';
import { useProgress } from '@/game/progress';
import { useOwnedCosmetics } from '@/game/useAvatar';
import { useDaily } from '@/game/useDaily';
import { useTranslation } from '@/i18n';
import { gameCenter, useGameCenter } from '@/services/gameCenter';
import { haptics } from '@/services/haptics';
import { penguinColors, radii, shadows, spacing, useTheme } from '@/theme';

export default function ProfileScreen() {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const { state, balance } = useWallet();
  const progress = useProgress();
  const daily = useDaily();
  const gc = useGameCenter();
  const owned = useOwnedCosmetics();
  // Mağaza vitrininden gelindiyse o kostüm denenmiş olarak açılır (?try=hat.crown).
  const params = useLocalSearchParams<{ try?: string }>();
  /** Denenen (henüz alınmamış) ürün. */
  const [trying, setTrying] = useState<Cosmetic | null>(() => {
    const wanted = getCosmetic(params.try);
    return wanted && !owned.has(wanted.id) ? wanted : null;
  });
  const [busy, setBusy] = useState(false);

  const equipped = state.profile.equipped;
  const avatar = avatarFrom(equipped, owned);
  // Önizleme: takılı kostümlerin üstüne denenen ürün.
  const preview = trying ? { ...avatar.costume, [trying.slot]: trying.look } : avatar.costume;
  const character = characters[avatar.character];

  const equip = (changes: Record<string, string | undefined>) => {
    const next: Record<string, string> = {};
    for (const [slot, id] of Object.entries({ ...equipped, ...changes })) if (id) next[slot] = id;
    void wallet().setEquipped(next);
  };

  const chooseCharacter = (id: CharacterId) => {
    haptics.select();
    equip({ character: id });
  };

  const chooseItem = (item: Cosmetic) => {
    haptics.select();
    if (!owned.has(item.id)) {
      // Sahip değil: dene (aynı ürüne ikinci dokunuş denemeyi bırakır).
      setTrying(trying?.id === item.id ? null : item);
      return;
    }
    setTrying(null);
    equip({ [item.slot]: equipped[item.slot] === item.id ? undefined : item.id });
  };

  const clearSlot = (slot: CosmeticSlot) => {
    haptics.select();
    if (trying?.slot === slot) setTrying(null);
    equip({ [slot]: undefined });
  };

  const buy = async () => {
    if (!trying || busy) return;
    // Pakete özel kostüm coinle alınmaz: mağazadaki pakete götür.
    if (trying.exclusive) {
      router.push('/shop');
      return;
    }
    setBusy(true);
    const result = await wallet().buyCosmetic(trying.id, trying.price);
    setBusy(false);
    if (result === 'insufficient') {
      haptics.nope();
      return;
    }
    haptics.success();
    equip({ [trying.slot]: trying.id });
    setTrying(null);
  };

  const affordable = trying ? balance.raw >= trying.price : true;
  /** Denenen kostüm bir mağaza paketine özelse o paket. */
  const bundle = trying?.exclusive ? getProduct(trying.exclusive) : undefined;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.side}>
          <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        </View>
        <AppText variant="heading" accessibilityRole="header">
          {t('profile.title')}
        </AppText>
        <View style={[styles.side, styles.right]}>
          <CoinCounter />
        </View>
      </View>

      {/* Avatar: dokununca zıplar; denenen kostüm hemen üstünde görünür. */}
      <View style={styles.hero}>
        <Penguin
          character={avatar.character}
          costume={preview}
          size={150}
          mood={trying ? 'excited' : 'happy'}
          label={character.name[language]}
        />
        <AppText variant="title" center>
          {character.name[language]}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Karakter: altı penguen, hepsi ücretsiz. */}
        <Section title={t('profile.character')}>
          {characterList.map((c) => (
            <Chip
              key={c.id}
              label={c.name[language]}
              selected={c.id === avatar.character}
              tone={penguinColors[c.color].main}
              onPress={() => chooseCharacter(c.id)}
            >
              <Penguin character={c.id} size={52} interactive={false} />
            </Chip>
          ))}
        </Section>

        {cosmeticSlots.map(({ slot, titleKey }) => (
          <Section key={slot} title={t(titleKey)}>
            <Chip
              label={t('profile.none')}
              selected={!getCosmetic(equipped[slot]) && trying?.slot !== slot}
              tone={colors.primary}
              onPress={() => clearSlot(slot)}
            >
              <Penguin character={avatar.character} size={52} interactive={false} />
            </Chip>
            {cosmetics
              .filter((item) => item.slot === slot)
              .map((item) => {
                const mine = owned.has(item.id);
                const wearing = mine && equipped[slot] === item.id;
                return (
                  <Chip
                    key={item.id}
                    label={t(item.nameKey)}
                    selected={wearing || trying?.id === item.id}
                    tone={trying?.id === item.id ? colors.accent : colors.primary}
                    price={mine || item.exclusive ? undefined : item.price}
                    owned={mine}
                    locked={!mine && !!item.exclusive}
                    onPress={() => chooseItem(item)}
                  >
                    <Penguin
                      character={avatar.character}
                      costume={{ [slot]: item.look }}
                      size={52}
                      interactive={false}
                    />
                  </Chip>
                );
              })}
          </Section>
        ))}

        {/* İstatistikler */}
        <View style={[styles.stats, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}>
          <Stat icon="star.fill" tint={colors.coin} value={`${progress.totalStars}`} label={t('profile.stars')} />
          <Stat icon="flame.fill" tint={colors.accent} value={`${daily.streak}`} label={t('profile.streak')} />
          <Stat
            icon="trophy.fill"
            tint={colors.primary}
            value={`${state.duelStats.wins} · ${state.duelStats.draws} · ${state.duelStats.losses}`}
            label={`${t('profile.wins')} · ${t('profile.draws')} · ${t('profile.losses')}`}
          />
        </View>

        {/* Başarımlar: kazanılanlar renkli, bekleyenler soluk; yanında coin ödülü. */}
        <View style={styles.section}>
          <AppText variant="label" muted>
            {t('achievement.title')} · {t('achievement.count', { n: state.achievements.length, max: achievementIds.length })}
          </AppText>
          <View style={[styles.achievements, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}>
            {achievementIds.map((id) => {
              const done = state.achievements.includes(id);
              return (
                <View key={id} style={[styles.achievement, !done && styles.pending]} accessible>
                  <SymbolView
                    name={done ? 'trophy.fill' : 'trophy'}
                    size={18}
                    weight="bold"
                    tintColor={done ? colors.coin : colors.textMuted}
                  />
                  <AppText style={styles.achievementName} numberOfLines={1}>
                    {t(achievementTitleKey(id))}
                  </AppText>
                  <CoinIcon size={14} />
                  <AppText variant="caption" muted>
                    {economy.achievements[id]}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Game Center: liderlik tabloları ve başarım ekranı. */}
        {gc.available && (
          <View style={styles.links}>
            <PressableScale
              accessibilityLabel={t('gamecenter.leaderboards')}
              onPress={() => void gameCenter.show('leaderboards')}
              style={[styles.link, { backgroundColor: colors.surface }]}
            >
              <SymbolView name="list.number" size={18} weight="bold" tintColor={colors.primary} />
              <AppText variant="label">{t('gamecenter.leaderboards')}</AppText>
            </PressableScale>
            <PressableScale
              accessibilityLabel={t('gamecenter.achievements')}
              onPress={() => void gameCenter.show('achievements')}
              style={[styles.link, { backgroundColor: colors.surface }]}
            >
              <SymbolView name="rosette" size={18} weight="bold" tintColor={colors.primary} />
              <AppText variant="label">{t('gamecenter.achievements')}</AppText>
            </PressableScale>
          </View>
        )}
      </ScrollView>

      {/* Deneme çubuğu: denenen ürünü satın al. */}
      {trying && (
        <View style={styles.buy}>
          <BigButton
            title={
              bundle
                ? t('profile.onlyIn', { name: t(bundle.nameKey) })
                : affordable
                  ? `${t('profile.buy')}  ${trying.price}`
                  : t('profile.noCoins')
            }
            subtitle={t(trying.nameKey)}
            icon={bundle ? 'gift.fill' : affordable ? 'bag.fill' : 'lock.fill'}
            tone="accent"
            size="medium"
            disabled={!bundle && (!affordable || busy)}
            onPress={buy}
          />
        </View>
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
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

/** Seçilebilir küçük kart: üstte penguen önizlemesi, altında ad ve (varsa) fiyat. */
function Chip({
  label,
  selected,
  tone,
  price,
  owned = false,
  locked = false,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  /** Seçiliyken çerçeve rengi. */
  tone: string;
  /** Sahip olunmayan ürünün fiyatı. */
  price?: number;
  owned?: boolean;
  /** Coinle alınamaz: bir mağaza paketiyle gelir. */
  locked?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <PressableScale
      haptic={false}
      accessibilityLabel={`${label}${price !== undefined ? `, ${price} ${t('home.coins')}` : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        shadows.soft(colors.shadow),
        { backgroundColor: colors.surface, borderColor: selected ? tone : colors.surface },
      ]}
    >
      <View pointerEvents="none">{children}</View>
      <AppText variant="caption" numberOfLines={1}>
        {label}
      </AppText>
      {price !== undefined ? (
        <View style={styles.price}>
          <CoinIcon size={14} />
          <AppText variant="caption" muted>
            {price}
          </AppText>
        </View>
      ) : owned ? (
        <SymbolView name="checkmark.circle.fill" size={16} tintColor={colors.primary} />
      ) : locked ? (
        <SymbolView name="gift.fill" size={16} tintColor={colors.accent} />
      ) : null}
    </PressableScale>
  );
}

function Stat({ icon, tint, value, label }: { icon: 'star.fill' | 'flame.fill' | 'trophy.fill'; tint: string; value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <SymbolView name={icon} size={22} weight="bold" tintColor={tint} />
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" muted center>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  hero: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { gap: spacing.md, paddingHorizontal: spacing.xs, paddingBottom: spacing.lg },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    // Satırda üç kart: kalan boşluğu eşit paylaşırlar.
    width: '31%',
    minHeight: 104,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 3,
    alignItems: 'center',
    gap: 2,
  },
  price: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stats: {
    flexDirection: 'row',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  achievements: { borderRadius: radii.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  achievementName: { flex: 1 },
  pending: { opacity: 0.5 },
  links: { gap: spacing.sm },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radii.pill,
  },
  buy: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
