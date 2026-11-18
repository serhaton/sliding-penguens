/**
 * Karartma taşması: ekran içeriği iPad'de ortalanmış dar bir sütundur, bu yüzden
 * içine konan karartma katmanı kenarlara ulaşmaz. Bu parça karartmanın soluna ve
 * sağına aynı renkte iki şerit ekleyerek ekranın tamamını kaplatır.
 */
import { StyleSheet, View } from 'react-native';

/** Şerit genişliği: en geniş ekranın kenar boşluğundan bolca büyük. */
const BLEED = 2000;

export function ScrimBleed({ opacity = 0.35 }: { opacity?: number }) {
  const backgroundColor = `rgba(13, 24, 48, ${opacity})`;
  return (
    <>
      <View pointerEvents="none" style={[styles.strip, { left: -BLEED, backgroundColor }]} />
      <View pointerEvents="none" style={[styles.strip, { right: -BLEED, backgroundColor }]} />
    </>
  );
}

const styles = StyleSheet.create({
  strip: { position: 'absolute', top: 0, bottom: 0, width: BLEED },
});
