/**
 * Cüzdan tanılama (yalnızca geliştirme sürümü).
 *
 * iCloud senkronizasyonunu gerçek cihazlarda sınamak için: bakiye, bu cihazın
 * kimliği, iCloud durumu, buluttaki cihaz belgeleri ve yerel işlem geçmişi.
 * Düğmelerle sahte işlemler üretilir (gerçek para ya da reklam yok).
 * Ayarlar → Geliştirici → Cüzdan tanılama.
 *
 * Etiketler bilerek çevrilmedi: bu ekranı yalnızca geliştirici görür.
 */
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, IconButton, PressableScale, Screen } from '@/components/ui';
import { useWallet, wallet, walletDiagnostics } from '@/economy/wallet';
import { useTranslation } from '@/i18n';
import { radii, shadows, spacing, useTheme } from '@/theme';

/** Her sahte işlem için benzersiz kimlik ve bugünün tarihi (düğmeye basılınca hesaplanır). */
const unique = () => String(Date.now());
const today = () => new Date().toISOString().slice(0, 10);

function Card({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, shadows.soft(colors.shadow), { backgroundColor: colors.surface }]}>
      <AppText variant="label" muted>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="label" selectable style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} style={[styles.action, { backgroundColor: colors.surfaceSunken }]}>
      <AppText variant="caption">{label}</AppText>
    </PressableScale>
  );
}

export default function WalletDiagnostics() {
  const { t } = useTranslation();
  const snapshot = useWallet();
  const { deviceId, quotaExceeded } = walletDiagnostics();
  const [last, setLast] = useState('—');
  const { balance, state } = snapshot;

  /** İşlemi çalıştırır ve sonucunu ekranda gösterir. */
  const run = (label: string, action: () => Promise<unknown>) => () => {
    action().then(
      (result) => setLast(`${label} → ${String(result ?? 'tamam')}`),
      (error: unknown) => setLast(`${label} → HATA ${String(error)}`),
    );
  };
  /** Henüz 3 yıldız alınmamış ilk test bölümü. */
  const nextTestLevel = () => {
    for (let i = 1; ; i++) if ((state.stars[`test-${i}`] ?? 0) < 3) return `test-${i}`;
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <AppText variant="heading">{t('dev.wallet')}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Card title="Bakiye">
          <AppText variant="display">{balance.display}</AppText>
          <Row label="gerçek (borç dahil)" value={balance.raw} />
          <Row label="kazanılan" value={balance.earned} />
          <Row label="satın alınan" value={balance.purchased} />
          <Row label="harcanan" value={balance.spent} />
        </Card>

        <Card title="iCloud">
          <Row label="durum" value={snapshot.cloudAvailable ? 'açık' : 'KAPALI (yalnızca yerel)'} />
          <Row label="gönderilmeyi bekleyen" value={snapshot.pendingSync ? 'var' : 'yok'} />
          <Row label="bu cihazın anahtarı" value={`dev.v1.${deviceId}`} />
          <Row label="belge boyutu" value={`${snapshot.docBytes} bayt${snapshot.docTooLarge ? ' (BÜYÜK)' : ''}`} />
          <Row label="kota aşımı" value={quotaExceeded ? 'EVET' : 'hayır'} />
          <Action label="Şimdi eşitle" onPress={run('eşitle', () => wallet().sync())} />
        </Card>

        <Card title="Sahte işlemler">
          <View style={styles.actions}>
            <Action
              label="Bölüm 3★ (+35)"
              onPress={run('bölüm', () => wallet().recordLevelResult(nextTestLevel(), 3))}
            />
            <Action
              label="Aynı bölüm tekrar (+0)"
              onPress={run('tekrar', () => wallet().recordLevelResult('test-1', 3))}
            />
            <Action label="Satın alım (+500)" onPress={run('satın alım', () => wallet().addPurchase(`dev-${unique()}`, 500))} />
            <Action
              label="Sabit satın alım tx-AYNI"
              onPress={run('tx-AYNI', () => wallet().addPurchase('dev-tx-AYNI', 500))}
            />
            <Action label="İade tx-AYNI" onPress={run('iade', () => wallet().revokePurchase('dev-tx-AYNI'))} />
            <Action label="Harca (−60)" onPress={run('harca', () => wallet().spend(`dev-${unique()}`, 60, 'dev'))} />
            <Action label="Video ödülü (+35)" onPress={run('video', () => wallet().addAdBonus(`dev-${unique()}`, 35))} />
            <Action label="Günlük bulmaca (+50)" onPress={run('günlük', () => wallet().claimDailyPuzzle(today()))} />
          </View>
          <Row label="son işlem" value={last} />
        </Card>

        <Card title="Birleşik durum">
          <Row label="yıldızlı bölüm" value={Object.keys(state.stars).length} />
          <Row label="günlük kayıt" value={state.dailyClaims.length} />
          <Row label="satın alım / iade" value={`${Object.keys(state.purchases).length} / ${state.revoked.length}`} />
          <Row label="video coinleri" value={state.adBonus} />
          <Row label="harcama sayacı" value={state.spent} />
        </Card>

        <Card title="Yerel işlem geçmişi (son 12)">
          {wallet()
            .history()
            .slice(0, 12)
            .map((entry) => (
              <Row key={entry.id} label={`${entry.kind} · ${entry.source}`} value={entry.amount > 0 ? `+${entry.amount}` : entry.amount} />
            ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerSpacer: { width: 48 },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: { borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  value: { flexShrink: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    paddingHorizontal: spacing.sm + spacing.xs,
    minHeight: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
