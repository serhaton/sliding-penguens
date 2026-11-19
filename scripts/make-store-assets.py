#!/usr/bin/env python3
"""
Mağaza ve site görsellerini üretir (geliştirici aracı; Pillow gerekir).

Girdi: scripts/store-shots.py'nin simülatörden aldığı ham ekran görüntüleri.
Çıktı:
  docs/1.0/appstore/screenshots/<dil>/<boyut>/NN-ad.png   App Store'a yüklenecek başlıklı görseller
  docs/1.0/assets/shots/<dil>/NN-ad.jpg                   site için küçük kopyalar
  assets/icon.png, assets/splash-icon.png                 uygulama ikonu ve açılış görseli
  docs/1.0/assets/icon.png, docs/1.0/assets/og-<dil>.png  site ikonu ve paylaşım görseli

  python3 scripts/make-store-assets.py <telefon-klasörü> [<ipad-klasörü>]

App Store kuralları (Kasım 2026): PNG ya da JPEG, saydamlık yok, boyut başına en
fazla 10 görsel. Boyutlar: iPhone 1320×2868 ve 1206×2622, iPad 2064×2752.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'node_modules', '@expo-google-fonts', 'nunito', '900Black', 'Nunito_900Black.ttf')
DOCS = os.path.join(ROOT, 'docs', '1.0')

# İkon sahnesi (app/dev/icon.tsx): kare ekranın solundan başlar; 3x ekranda piksel karşılıkları.
ICON_TOP, ICON_SIZE, SCALE = 120, 342, 3

GRADIENT = [(143, 227, 245), (79, 168, 255), (91, 123, 255)]
INK = (26, 35, 64)

CAPTIONS = {
    'en': {
        '01-home': 'Slide. Bump.\nCome home.',
        '02-level': 'Tap a penguin,\nwatch it glide',
        '03-map': '90 puzzles\nacross Antarctica',
        '04-complete': 'Fewer moves,\nmore stars',
        '05-cracked': 'Cracked ice\nholds only once',
        '06-sleepy': 'Wake up\nthe sleepy ones',
        '07-duel': 'Duel a friend\nor the computer',
        '08-profile': 'Dress up\nyour penguin',
        '09-shop': 'Hats, hair and\nrainbow scarves',
        '10-daily': 'A new puzzle\nevery day',
    },
    'tr': {
        '01-home': 'Kay. Çarp.\nYuvana dön.',
        '02-level': 'Penguene dokun,\nkaymasını izle',
        '03-map': "Antarktika'da\n90 bulmaca",
        '04-complete': 'Az hamle,\nçok yıldız',
        '05-cracked': 'Çatlak buz\nbir kez taşır',
        '06-sleepy': 'Uykucuları\nuyandır',
        '07-duel': 'Arkadaşınla ya da\nbilgisayarla düello',
        '08-profile': 'Penguenini\ngiydir',
        '09-shop': 'Şapkalar, saçlar,\ngökkuşağı atkılar',
        '10-daily': 'Her gün\nyeni bir bulmaca',
    },
}

TITLE = {'en': 'Pengolo', 'tr': 'Pengolo'}
TAGLINE = {'en': 'Slide. Bump. Come home.', 'tr': 'Kay. Çarp. Yuvana dön.'}


def gradient(width, height):
    """Sol üstten sağ alta üç duraklı renk geçişi (ikonla aynı gökyüzü)."""
    small = Image.new('RGB', (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126
            a, b = (GRADIENT[0], GRADIENT[1]) if t < 0.5 else (GRADIENT[1], GRADIENT[2])
            k = t * 2 if t < 0.5 else (t - 0.5) * 2
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * k) for i in range(3))
    return small.resize((width, height), Image.BICUBIC)


def rounded(image, radius):
    mask = Image.new('L', image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.size[0] - 1, image.size[1] - 1), radius, fill=255)
    out = image.convert('RGBA')
    out.putalpha(mask)
    return out


def fit_font(draw, text, max_width, size):
    while size > 20:
        font = ImageFont.truetype(FONT, size)
        box = draw.multiline_textbbox((0, 0), text, font=font, align='center', spacing=size * 0.12)
        if box[2] - box[0] <= max_width:
            return font
        size -= 4
    return ImageFont.truetype(FONT, size)


def framed(shot_path, caption, size):
    """Başlıklı mağaza görseli: gökyüzü zemini, üstte başlık, altında çerçeveli ekran görüntüsü."""
    width, height = size
    canvas = gradient(width, height).convert('RGBA')
    draw = ImageDraw.Draw(canvas)

    font = fit_font(draw, caption, width * 0.86, round(width * 0.094))
    spacing = font.size * 0.12
    box = draw.multiline_textbbox((0, 0), caption, font=font, align='center', spacing=spacing)
    text_h = box[3] - box[1]
    top_area = height * 0.2
    x = (width - (box[2] - box[0])) / 2 - box[0]
    y = (top_area - text_h) / 2 - box[1] + height * 0.012
    draw.multiline_text((x + 3, y + 5), caption, font=font, fill=(27, 60, 140, 70), align='center', spacing=spacing)
    draw.multiline_text((x, y), caption, font=font, fill=(255, 255, 255, 255), align='center', spacing=spacing)

    shot = Image.open(shot_path).convert('RGB')
    target_w = round(width * 0.77)
    target_h = round(shot.size[1] * target_w / shot.size[0])
    shot = shot.resize((target_w, target_h), Image.LANCZOS)
    bezel = round(width * 0.012)
    # iPad'in ekran köşeleri telefona göre çok daha az yuvarlaktır.
    tablet = width / height > 0.6
    radius = round(target_w * (0.03 if tablet else 0.085))
    device = Image.new('RGBA', (target_w + bezel * 2, target_h + bezel * 2), (0, 0, 0, 0))
    ImageDraw.Draw(device).rounded_rectangle(
        (0, 0, device.size[0] - 1, device.size[1] - 1), radius + bezel, fill=INK + (255,)
    )
    device.alpha_composite(rounded(shot, radius), (bezel, bezel))

    left = (width - device.size[0]) // 2
    top = round(top_area)
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (left, top + bezel * 3, left + device.size[0], top + device.size[1] + bezel * 3), radius, fill=(20, 40, 110, 110)
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(width * 0.03)))
    canvas.alpha_composite(device, (left, top))
    return canvas.convert('RGB')


def save(image, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image.save(path, optimize=True)


def store_shots(folder, sizes):
    """`sizes`: { klasör adı: (genişlik, yükseklik) }. İlk boyut ham görüntünün kendi boyutudur."""
    for lang, captions in CAPTIONS.items():
        for name, caption in captions.items():
            source = os.path.join(folder, lang, name + '.png')
            if not os.path.exists(source):
                print('eksik:', source)
                continue
            base = None
            for label, size in sizes.items():
                if base is None:
                    base = framed(source, caption, size)
                    image = base
                else:
                    # Aynı en-boy oranındaki küçük boyut: büyüğünden küçültülür.
                    image = base.resize(size, Image.LANCZOS)
                save(image, os.path.join(DOCS, 'appstore', 'screenshots', lang, label, name + '.png'))


def web_shots(folder):
    for lang in CAPTIONS:
        for name in CAPTIONS[lang]:
            source = os.path.join(folder, lang, name + '.png')
            if not os.path.exists(source):
                continue
            image = Image.open(source).convert('RGB')
            image = image.resize((660, round(image.size[1] * 660 / image.size[0])), Image.LANCZOS)
            path = os.path.join(DOCS, 'assets', 'shots', lang, name + '.jpg')
            os.makedirs(os.path.dirname(path), exist_ok=True)
            image.save(path, quality=84, optimize=True)


def icons(scene_path):
    scene = Image.open(scene_path).convert('RGB')
    side = ICON_SIZE * SCALE
    square = scene.crop((0, ICON_TOP * SCALE, side, ICON_TOP * SCALE + side))
    icon = square.resize((1024, 1024), Image.LANCZOS)
    # Uygulama ikonu: tam kare, saydamlık yok (iOS köşeleri kendisi yuvarlar).
    save(icon, os.path.join(ROOT, 'assets', 'icon.png'))
    save(icon.resize((512, 512), Image.LANCZOS), os.path.join(DOCS, 'assets', 'icon.png'))
    # Açılış görseli: yuvarlak rozet, köşeleri saydam (açık ve koyu zeminde durur).
    big = icon.resize((2048, 2048), Image.LANCZOS)
    mask = Image.new('L', big.size, 0)
    ImageDraw.Draw(mask).ellipse((24, 24, 2023, 2023), fill=255)
    badge = big.convert('RGBA')
    badge.putalpha(mask)
    save(badge.resize((1024, 1024), Image.LANCZOS), os.path.join(ROOT, 'assets', 'splash-icon.png'))
    return icon


def social(icon):
    """Site paylaşım görseli (Open Graph, 1200×630): ikon + ad + slogan."""
    for lang in TITLE:
        canvas = gradient(1200, 630).convert('RGBA')
        draw = ImageDraw.Draw(canvas)
        art = rounded(icon.resize((360, 360), Image.LANCZOS), 82)
        shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((90, 155, 450, 515), 82, fill=(20, 40, 110, 120))
        canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)))
        canvas.alpha_composite(art, (90, 135))
        title = TITLE[lang].replace(' ', '\n')
        font = ImageFont.truetype(FONT, 108)
        # Tek kelimelik ad tek satırdır: sloganla birlikte dikeyde ortalanır.
        single = '\n' not in title
        draw.multiline_text((520, 205 if single else 150), title, font=font, fill=(255, 255, 255, 255), spacing=4)
        draw.text((522, 345 if single else 420), TAGLINE[lang], font=ImageFont.truetype(FONT, 40), fill=(255, 255, 255, 235))
        save(canvas.convert('RGB'), os.path.join(DOCS, 'assets', f'og-{lang}.png'))


def main():
    phone = sys.argv[1]
    ipad = sys.argv[2] if len(sys.argv) > 2 else None
    store_shots(phone, {'iphone-6.9': (1320, 2868), 'iphone-6.3': (1206, 2622)})
    web_shots(phone)
    scene = os.path.join(phone, 'icon-scene.png')
    if os.path.exists(scene):
        social(icons(scene))
    if ipad:
        store_shots(ipad, {'ipad-13': (2064, 2752)})


if __name__ == '__main__':
    main()
