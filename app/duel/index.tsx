/**
 * Düello lobisi: üç kart.
 *   1. Arkadaşınla — aynı telefonda, karşı karşıya.
 *   2. Bilgisayara karşı — zorluk seçimiyle.
 *   3. Online — yakında (Game Center ile, sonraki güncellemede).
 */
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Difficulty } from '@/ai';
import { Penguin } from '@/components/penguin';
import { withoutScarf } from '@/game/avatar';
import { useAvatar } from '@/game/useAvatar';
import { AppText, BigButton, IconButton, PressableScale, Screen, Segmented } from '@/components/ui';
import { characters } from '@/data/characters';
import { randomRivalColor } from '@/data/duel';
import { SERIES_WINS } from '@/game/duel';
import { useTranslation } from '@/i18n';
import { isTablet, radii, s, shadows, spacing, useTheme } from '@/theme';

export default function DuelLobbyScreen() {
  const { t } = useTranslation();
  const avatar = withoutScarf(useAvatar());
  const { colors } = useTheme();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  // Oyuncu kendi pengueninin renginde; rakibin rengi lobi açılırken rastgele seçilir ve maça taşınır.
  const mine = characters[avatar.character].color;
  const [rival] = useState(() => randomRivalColor(mine));

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <AppText variant="heading" accessibilityRole="header">
          {t('duel.title')}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* İki takımın penguenleri karşı karşıya: ekranın ne olduğunu yazısız anlatır. */}
      <View style={styles.hero}>
        <Penguin character={avatar.character} costume={avatar.costume} color={mine} direction="right" mood="excited" size={isTablet ? s(190) : 120} label={t(`duel.${mine}`)} />
        <View style={styles.versus}>
          <AppText variant="title" muted>
            vs
          </AppText>
          <AppText variant="caption" muted center>
            {t('duel.firstTo', { n: SERIES_WINS })}
          </AppText>
        </View>
        <Penguin color={rival} direction="left" mood="excited" size={isTablet ? s(190) : 120} label={t(`duel.${rival}`)} />
      </View>

      <View style={styles.cards}>
        {/* 1 — Aynı cihazda iki kişi: kartın tamamı butondur. */}
        <PressableScale
          pressScale={0.97}
          accessibilityLabel={`${t('duel.local')}, ${t('duel.localHint')}`}
          onPress={() => router.push({ pathname: '/duel/play', params: { mode: 'local', rival } })}
        >
          <Card icon="person.2.fill" tint={colors.accent} title={t('duel.local')} hint={t('duel.localHint')}>
            <SymbolView name="chevron.right" size={s(20)} weight="bold" tintColor={colors.textMuted} />
          </Card>
        </PressableScale>

        {/* 2 — Bilgisayara karşı */}
        <Card icon="desktopcomputer" tint={colors.primary} title={t('duel.vsCpu')}>
          {null}
          <View style={styles.cpu}>
            <Segmented
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: 'easy', label: t('duel.easy') },
                { value: 'medium', label: t('duel.medium') },
                { value: 'hard', label: t('duel.hard') },
              ]}
            />
            <BigButton
              title={t('duel.start')}
              icon="play.fill"
              size="medium"
              onPress={() => router.push({ pathname: '/duel/play', params: { mode: 'cpu', difficulty, rival } })}
            />
          </View>
        </Card>

        {/* 3 — Online: henüz yok, soluk durur. */}
        <View style={styles.soon} accessibilityLabel={`${t('duel.online')}, ${t('soon.title')}`}>
          <Card icon="globe" tint={colors.textMuted} title={t('duel.online')} hint={t('soon.title')} />
        </View>
      </View>
    </Screen>
  );
}

/** Lobi kartı: ikon, başlık, isteğe bağlı açıklama; sağda ve altta ek içerik. */
function Card({
  icon,
  tint,
  title,
  hint,
  children,
}: {
  icon: SymbolViewProps['name'];
  tint: string;
  title: string;
  hint?: string;
  /** İlk çocuk başlık satırının sağına, ikincisi kartın altına yerleşir. */
  children?: ReactNode | [ReactNode, ReactNode];
}) {
  const { colors } = useTheme();
  const [trailing, below] = Array.isArray(children) ? children : [children, null];
  return (
    <View style={[styles.card, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}>
      <View style={styles.cardRow}>
        <View style={[styles.cardIcon, { backgroundColor: tint }]}>
          <SymbolView name={icon} size={s(26)} weight="bold" tintColor={colors.onPrimary} />
        </View>
        <View style={styles.cardTexts}>
          <AppText variant="heading">{title}</AppText>
          {hint && (
            <AppText variant="caption" muted>
              {hint}
            </AppText>
          )}
        </View>
        {trailing}
      </View>
      {below}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: s(48) },
  hero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  versus: { alignItems: 'center', maxWidth: s(96) },
  // iPad'de kartlar ekran boyunca uzamaz: ortada, okunur genişlikte.
  cards: { gap: spacing.md, marginBottom: spacing.lg, ...(isTablet && { width: '78%', alignSelf: 'center', marginBottom: spacing.xxl }) },
  card: { borderRadius: radii.lg, padding: spacing.md, gap: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: {
    width: s(56),
    height: s(56),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: { flex: 1 },
  cpu: { gap: spacing.md },
  soon: { opacity: 0.55 },
});
