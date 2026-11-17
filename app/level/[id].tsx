/**
 * Macera bölümü ekranı. Oynanış gövdesi ortak (components/level/LevelPlay);
 * burada bölümün ödülü cüzdana yazılır ve "Devam" sıradaki bölümü açar.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LevelPlay } from '@/components/level/LevelPlay';
import { AppText, IconButton, Screen } from '@/components/ui';
import { getLevel, levelNumber, nextLevel } from '@/data/levels';
import { wallet } from '@/economy/wallet';
import { useTranslation } from '@/i18n';

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
  const number = levelNumber(level.id);
  const nextId = nextLevel(level.id)?.id;
  return (
    <LevelPlay
      key={level.id}
      level={level}
      title={t('level.title', { n: number })}
      tutorial={number === 1}
      // İlerleme ve coinler cüzdana yazılır (aynı bölüm tekrar coin vermez).
      rewardFor={(stars) => wallet().previewLevelReward(level.id, stars)}
      onWin={(stars) => void wallet().recordLevelResult(level.id, stars)}
      hasNext={!!nextId}
      onNext={() => {
        if (nextId) router.replace({ pathname: '/level/[id]', params: { id: nextId } });
        else router.dismissTo('/');
      }}
      autoplay={__DEV__ ? auto : undefined}
      autoNext={__DEV__ && autoNext === '1'}
      autoShare={__DEV__ && autoShare === '1'}
      initialOffer={__DEV__ && (offer === 'hint' || offer === 'undo') ? offer : null}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
