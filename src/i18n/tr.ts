/**
 * Türkçe metinler — anahtar listesinin kaynağı burası.
 *
 * Yeni bir metin eklerken önce buraya ekle; `en.ts` aynı anahtarları içermek
 * zorunda (TypeScript eksik veya fazla anahtarı derleme hatası olarak gösterir).
 *
 * Yazım kuralı: kısa ve büyük. Bir butonda en fazla iki kelime.
 * Değişkenler süslü parantezle: 'Bölüm {n}'.
 */
export const tr = {
  // Uygulama
  'app.name': 'Kayan Penguenler',

  // Ana ekran
  'home.play': 'Oyna',
  'home.level': 'Bölüm {n}',
  'home.duel': 'Düello',
  'home.daily': 'Günlük bulmaca',
  'home.shop': 'Mağaza',
  'home.profile': 'Penguenim',
  'home.settings': 'Ayarlar',
  'home.map': 'Harita',
  'home.coins': 'Coin',

  // Dünya haritası
  'map.title': 'Harita',
  'map.antarctica': 'Antarktika',
  'map.episode': 'Macera {n}',
  'map.episode1': 'Buz Kıyısı',
  'map.episode2': 'Çatlak Buz',
  'map.episode3': 'Uyuyan Penguen',
  'map.sectionA': 'Sakin Kıyı',
  'map.sectionB': 'Dönme Buzulu',
  'map.sectionC': 'Dalga Koyu',
  'map.locked': 'Kilitli',
  'map.overview': 'Tüm kıta',
  'map.focus': 'Kaldığım yere dön',
  'map.stars': '{n} / {max} yıldız',

  // Ayarlar
  'settings.title': 'Ayarlar',
  'settings.language': 'Dil',
  'settings.theme': 'Tema',
  'settings.auto': 'Otomatik',
  'settings.day': 'Gündüz',
  'settings.night': 'Gece',
  'settings.music': 'Müzik',
  'settings.sfx': 'Ses efektleri',
  'settings.haptics': 'Titreşim',
  'settings.largeSymbols': 'Büyük semboller',
  'settings.largeSymbolsHint': 'Renkleri ayırt etmeyi kolaylaştırır',

  // Bölüm ekranı
  'level.title': 'Bölüm {n}',
  'level.moves': 'Hamle',
  'level.undo': 'Geri al',
  'level.hint': 'İpucu',
  'level.restart': 'Baştan başla',
  'level.stuck': 'Sıkıştın! Geri al ya da baştan başla.',
  'level.complete': 'Harika!',
  'level.completeMoves': '{n} hamle',
  'level.next': 'Devam',
  'level.replay': 'Tekrar oyna',
  'level.home': 'Ana ekran',
  'level.notFound': 'Bölüm bulunamadı',
  'level.double': '2 katı',
  'level.doubleHint': 'Video izle, coinleri ikiye katla',
  'level.share': 'Paylaş',

  // İpucu ve geri alma teklifi (coin ya da video)
  'offer.hint': 'İpucu',
  'offer.hintBody': 'Sıradaki hamleyi göster',
  'offer.undo': 'Geri al',
  'offer.undoBody': '{n} geri alma hakkı',
  'offer.video': 'Video izle',
  'offer.noCoins': 'Coin yetmiyor',

  // Mekanik tanıtımları (yeni kural ilk kez geldiğinde)
  'intro.turn': 'Çarpınca döner!',
  'intro.waves': 'Yeni penguenler geliyor!',
  'intro.gotIt': 'Anladım',

  // Henüz yapılmamış ekranlar
  'soon.title': 'Çok yakında',
  'soon.body': 'Penguenler burayı hazırlıyor.',

  // iCloud yedekleme
  'icloud.title': 'iCloud yedekleme',
  'icloud.on': 'Açık',
  'icloud.off': 'Kapalı',
  'icloud.pending': 'Gönderiliyor…',
  'icloud.offHint': 'Coinlerinin yedeklenmesi için iCloud\'u aç.',

  // Geliştirici ekranları (yalnızca geliştirme sürümünde görünür)
  'dev.title': 'Geliştirici',
  'dev.characters': 'Karakter sahnesi',
  'dev.levels': 'Bölüm görüntüleyici',
  'dev.waves': 'dalga',
  'dev.sectionA': 'A · Sabit yön (1–10)',
  'dev.sectionB': 'B · Çarpınca dön (11–20)',
  'dev.sectionC': 'C · Dalgalar (21–30)',
  'dev.resetIntros': 'Tanıtımları sıfırla',
  'dev.wallet': 'Cüzdan tanılama',
  'dev.preview': 'Önizleme',
  'dev.cast': 'Karakterler',
  'dev.moods': 'Yüz ifadeleri',
  'dev.poses': 'Pozlar ve yönler',
  'dev.board': 'Tahta parçaları',
  'dev.costume': 'Kostüm',
  'dev.largeSymbols': 'Büyük semboller',

  // Kişilikler
  'personality.curious': 'meraklı',
  'personality.hasty': 'aceleci',
  'personality.shy': 'utangaç',
  'personality.cheerful': 'neşeli',
  'personality.sleepy': 'uykucu',
  'personality.proud': 'gururlu',

  // Ortak
  'common.back': 'Geri',
  'common.close': 'Kapat',
} as const;

export type TranslationKey = keyof typeof tr;
export type Translations = Record<TranslationKey, string>;
