/**
 * Yeni mekanik tanıtım kartı: küçük bir tahtada kuralı gösteren hamleler
 * döngü hâlinde oynar. Yazı yalnızca kısa bir başlık; anlatımı animasyon yapar.
 * Oyuncu "Anladım" deyince kapanır ve o mekanik için bir daha gösterilmez.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Board } from '@/components/board';
import { AppText, BigButton, ScrimBleed } from '@/components/ui';
import type { MechanicIntro } from '@/data/mechanics';
import { useLevelSession } from '@/game/useLevelSession';
import { useTranslation } from '@/i18n';
import { radii, s, shadows, spacing, useTheme } from '@/theme';

/** Hamleler arası bekleme ve döngü sonu duraklaması (ms). */
const STEP_MS = 1250;
const LOOP_PAUSE_MS = 1500;
const DEMO_SIZE = s(230);

export function MechanicIntroCard({ mechanic, onDone }: { mechanic: MechanicIntro; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  /** Her döngüde gösterim baştan kurulur. */
  const [cycle, setCycle] = useState(0);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.scrim]}>
      <ScrimBleed opacity={0.45} />
      <View style={[styles.card, shadows.lifted(colors.shadow), { backgroundColor: colors.surface }]}>
        <AppText variant="title" center>
          {t(mechanic.titleKey)}
        </AppText>
        <View style={styles.demo} pointerEvents="none">
          <DemoRun key={cycle} mechanic={mechanic} onLoop={() => setCycle((c) => c + 1)} />
        </View>
        <BigButton title={t('intro.gotIt')} size="medium" onPress={onDone} />
      </View>
    </Animated.View>
  );
}

/** Gösterimin tek bir turu: hamleleri sırayla oynar, bitince haber verir. */
function DemoRun({ mechanic, onLoop }: { mechanic: MechanicIntro; onLoop: () => void }) {
  const session = useLevelSession(mechanic.demo);
  const [step, setStep] = useState(0);
  const { tap, betweenWaves } = session;

  useEffect(() => {
    // Dalga geçişinde bekle: o sırada dokunuş alınmaz.
    if (betweenWaves) return;
    const penguinId = mechanic.script[step];
    if (!penguinId) return;
    const timer = setTimeout(() => {
      tap(penguinId);
      setStep(step + 1);
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [step, betweenWaves, tap, mechanic.script]);

  // Son hamleden sonra kısa bir duraklama, sonra baştan.
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(onLoop, LOOP_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [finished, onLoop]);

  return (
    <Board
      level={mechanic.demo}
      state={session.state}
      signal={session.signal}
      maxWidth={DEMO_SIZE}
      maxHeight={DEMO_SIZE}
      silent
      onTapPenguin={() => {}}
      onFinished={() => {
        if (session.betweenWaves) session.nextWave();
        else setFinished(true);
      }}
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(13, 24, 48, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: s(360),
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  demo: { alignItems: 'center' },
});
