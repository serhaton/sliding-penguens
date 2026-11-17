/**
 * Paylaşım servisi: ekrandaki bir görünümü (sonuç kartı) PNG'ye çevirir ve iOS
 * paylaşım menüsünü açar. Ekranlar view-shot ve expo-sharing'i doğrudan çağırmaz.
 */
import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import { PixelRatio, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** Görüntüsü alınacak görünümün ref'i: `useRef<ViewHandle>(null)`. */
export type ViewHandle = ComponentRef<typeof View>;
export type CardRef = RefObject<ViewHandle | null>;

/** Paylaşılan görselin piksel genişliği (sosyal medya için yeterince keskin). */
const TARGET_WIDTH_PX = 1080;

/**
 * Görünümü PNG dosyasına çevirir ve dosyanın adresini döner.
 * `aspect`: yükseklik / genişlik oranı (kartın oranı korunur).
 */
export async function captureCard(ref: CardRef, aspect: number): Promise<string> {
  // view-shot ölçüyü nokta (pt) cinsinden ister; çıktı fiziksel pikseldir.
  const width = TARGET_WIDTH_PX / PixelRatio.get();
  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width,
    height: width * aspect,
  });
  return uri.startsWith('file://') ? uri : `file://${uri}`;
}

/**
 * Kartı paylaşım menüsüyle paylaşır. Paylaşım menüsü açıldıysa `true` döner.
 * Paylaşım asla oyunu bozmamalı: hata olursa sessizce `false` döner.
 */
export async function shareCard(ref: CardRef, aspect: number): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const uri = await captureCard(ref, aspect);
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    return true;
  } catch {
    return false;
  }
}
