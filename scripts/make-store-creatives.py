#!/usr/bin/env python3
"""
App Store ürün sayfası görsellerini üretir (geliştirici aracı; Chrome ve Pillow gerekir):

  docs/1.0/appstore/creative/<dil>/header-3840x1646.png    Header (21:9)
  docs/1.0/appstore/creative/<dil>/search-3840x2560.png    Search results (3:2)
  docs/1.0/appstore/creative/<dil>/search-1920x1280.png    aynısının küçük boyutu
  docs/1.0/appstore/creative/<dil>/preview-N-886x1920.png   önizleme görselleri, dikey (N = 1..3)
  docs/1.0/appstore/creative/<dil>/preview-N-1920x886.png   önizleme görselleri, yatay

  python3 scripts/make-store-creatives.py

Apple'ın ölçüleri (Kasım 2026, "Creative assets specifications"):
  Header  3840×1646, güvenli alan 1646×661, sol üst (1097, 493)
  Search  3840×2560, güvenli alan 2168×1030, sol üst (836, 765)
Önemli her şey (ad, slogan, tahta) güvenli alanın içinde durur; penguenler ve
kar tepeleri süstür, kırpılabilir. Saydamlık yok. `--guides` güvenli alanı çizer.

Tahta görüntüsü oyundan alınmış gerçek bir bölümdür: scripts/creative/board.png
(scripts/store-shots.py ile alınan 02-level görüntüsünden kırpıldı).
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', '1.0', 'appstore', 'creative')
FONT = os.path.join(ROOT, 'node_modules', '@expo-google-fonts', 'nunito', '900Black', 'Nunito_900Black.ttf')
BOARD = os.path.join(ROOT, 'scripts', 'creative', 'board.png')
BOARD_CRACKED = os.path.join(ROOT, 'scripts', 'creative', 'board-cracked.png')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

LETTER_COLORS = ['#2E86F5', '#FF8A3D', '#FF5470', '#FFB800', '#22C58B', '#8B6CF6']
TAGLINE = {'en': ('Slide. Bump.', 'Come home.'), 'tr': ('Kay. Çarp.', 'Yuvana dön.')}

# Önizleme görselleri: (tahta dosyası, tahtanın en/boy oranı, gece mi, iki satır başlık).
PREVIEWS = [
    (BOARD, 1116 / 1294, False, {'en': ('Tap a penguin,', 'watch it glide'), 'tr': ('Penguene dokun,', 'kaymasını izle')}),
    (BOARD_CRACKED, 1107 / 1308, False, {'en': ('Cracked ice', 'holds only once'), 'tr': ('Çatlak buz', 'bir kez taşır')}),
    (BOARD, 1116 / 1294, True, {'en': ('Cosy by day,', 'magical by night'), 'tr': ('Gündüz sıcacık,', 'gece büyülü')}),
]

PENGUIN = '''<symbol id="peng" viewBox="0 0 100 110">
  <ellipse cx="50" cy="106" rx="34" ry="4" fill="#1A2340" opacity=".12"/>
  <ellipse cx="38" cy="103" rx="11" ry="5" fill="#FF9F2E"/><ellipse cx="62" cy="103" rx="11" ry="5" fill="#FF9F2E"/>
  <ellipse cx="17" cy="68" rx="9" ry="20" fill="#273866" transform="rotate(14 17 68)"/>
  <ellipse cx="83" cy="68" rx="9" ry="20" fill="#273866" transform="rotate(-14 83 68)"/>
  <ellipse cx="50" cy="60" rx="34" ry="41" fill="#33477F"/>
  <ellipse cx="50" cy="72" rx="23" ry="27" fill="#FFF7EA"/>
  <circle cx="38" cy="45" r="15" fill="#FFF7EA"/><circle cx="62" cy="45" r="15" fill="#FFF7EA"/>
  <circle cx="40" cy="46" r="7.5" fill="#1A2340"/><circle cx="60" cy="46" r="7.5" fill="#1A2340"/>
  <circle cx="42.5" cy="43.5" r="2.6" fill="#fff"/><circle cx="62.5" cy="43.5" r="2.6" fill="#fff"/>
  <ellipse cx="29" cy="55" rx="5" ry="3.2" fill="#FFB3C1"/><ellipse cx="71" cy="55" rx="5" ry="3.2" fill="#FFB3C1"/>
  <path d="M44.5 53.5h11L50 61z" fill="#FF9F2E"/>
  <rect x="17" y="66" width="66" height="12" rx="6" fill="currentColor"/>
  <rect x="59" y="74" width="12" height="20" rx="3.5" fill="currentColor"/>
</symbol>
<symbol id="igloo" viewBox="0 0 120 110">
  <path d="M60 40V8" stroke="#33477F" stroke-width="4" stroke-linecap="round"/><path d="M60 8l26 9-26 9z" fill="currentColor"/>
  <path d="M8 104a52 52 0 0 1 104 0z" fill="#F4F9FF" stroke="#C4DDF3" stroke-width="4"/>
  <path d="M44 104V84a16 16 0 0 1 32 0v20z" fill="#273866"/><path d="M44 104V84a16 16 0 0 1 32 0v20" fill="none" stroke="currentColor" stroke-width="7"/>
</symbol>'''


def wordmark(x, y, size):
    """Renkli harfli, beyaz çerçeveli ad. (x, y): yazının ortası ve taban çizgisi."""
    spans = ''.join(f'<tspan fill="{LETTER_COLORS[i % 6]}">{ch}</tspan>' for i, ch in enumerate('Pengolo'))
    stroke = round(size * 0.2)
    return (
        f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}" stroke="#fff" stroke-width="{stroke}" '
        f'stroke-linejoin="round" paint-order="stroke" style="filter:drop-shadow(0 {round(size * 0.05)}px {round(size * 0.05)}px rgba(20,40,110,.28))">{spans}</text>'
    )


def penguin(x, y, size, color, flip=False):
    inner = f'<use href="#peng" width="{size}" height="{size * 1.1}"/>'
    if flip:
        inner = f'<g transform="translate({size} 0) scale(-1 1)">{inner}</g>'
    return f'<g transform="translate({x} {y})" style="color:{color}">{inner}</g>'


def igloo(x, y, size, color):
    return f'<g transform="translate({x} {y})" style="color:{color}"><use href="#igloo" width="{size}" height="{size * 110 / 120}"/></g>'


def snow(width, height, seed):
    """Sabit tohumlu kar taneleri: her üretimde aynı yerde."""
    dots, value = [], seed
    for _ in range(70):
        value = (value * 1103515245 + 12345) % 2147483648
        x = value % width
        value = (value * 1103515245 + 12345) % 2147483648
        y = value % int(height * 0.72)
        value = (value * 1103515245 + 12345) % 2147483648
        r = 5 + value % 12
        dots.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity="{0.45 + (value % 40) / 100:.2f}"/>')
    return ''.join(dots)


def frame(width, height, body, guides=None, night=False):
    guide = ''
    if guides:
        gx, gy, gw, gh = guides
        guide = f'<rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" fill="none" stroke="#f0f" stroke-width="6" stroke-dasharray="30 20"/>'
    if night:
        sky = '<stop offset="0" stop-color="#0D1830"/><stop offset="1" stop-color="#1D2F63"/>'
        aurora = f'<rect width="{width}" height="{height}" fill="url(#aurora-a)"/><rect width="{width}" height="{height}" fill="url(#aurora-b)"/>'
    else:
        sky = '<stop offset="0" stop-color="#8FE3F5"/><stop offset=".55" stop-color="#4FA8FF"/><stop offset="1" stop-color="#5B7BFF"/>'
        aurora = ''
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Pengolo; src: url("file://{FONT}"); }}
html, body {{ margin: 0; background: #4FA8FF; }}
svg {{ display: block; font-family: Pengolo, sans-serif; font-weight: 900; }}
</style></head><body>
<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">{sky}</linearGradient>
  <radialGradient id="aurora-a" cx=".15" cy="0" r=".8"><stop offset="0" stop-color="#2DD4A0" stop-opacity=".55"/><stop offset="1" stop-color="#2DD4A0" stop-opacity="0"/></radialGradient>
  <radialGradient id="aurora-b" cx=".9" cy=".05" r=".8"><stop offset="0" stop-color="#8B6CF6" stop-opacity=".6"/><stop offset="1" stop-color="#8B6CF6" stop-opacity="0"/></radialGradient>
  {PENGUIN}
</defs>
<rect width="{width}" height="{height}" fill="url(#sky)"/>
{aurora}
{body}
{guide}
</svg></body></html>'''


def header(lang, guides):
    w, h = 3840, 1646
    line = ' '.join(TAGLINE[lang])
    body = f'''
<circle cx="{w / 2}" cy="800" r="900" fill="#fff" opacity=".10"/><circle cx="{w / 2}" cy="800" r="620" fill="#fff" opacity=".10"/>
{snow(w, h, 7)}
<ellipse cx="700" cy="1760" rx="1700" ry="520" fill="#D6ECFB"/>
<ellipse cx="3200" cy="1800" rx="1700" ry="560" fill="#E6F3FD"/>
<ellipse cx="1920" cy="1900" rx="2200" ry="520" fill="#fff"/>
{igloo(120, 1010, 380, '#22C58B')}
{igloo(3350, 1000, 400, '#FF5470')}
{penguin(520, 1010, 330, '#22C58B')}
{penguin(860, 1080, 380, '#FF8A3D')}
{penguin(1260, 1170, 330, '#8B6CF6')}
{penguin(2250, 1170, 330, '#FFB800', flip=True)}
{penguin(2600, 1080, 380, '#FF5470', flip=True)}
{penguin(2990, 1010, 330, '#2E86F5', flip=True)}
{wordmark(w / 2, 850, 350)}
<text x="{w / 2}" y="1085" text-anchor="middle" font-size="128" fill="#fff" style="filter:drop-shadow(0 6px 8px rgba(20,40,110,.35))">{line}</text>
'''
    return frame(w, h, body, (1097, 493, 1646, 661) if guides else None)


def search(lang, guides):
    w, h = 3840, 2560
    first, second = TAGLINE[lang]
    # Tahta: güvenli alanın sağ yarısında, tam yüksekliğe yakın.
    bh = 1000
    bw = round(bh * 1116 / 1294)
    bx, by = 2090, 780
    body = f'''
<circle cx="{bx + bw / 2}" cy="{by + bh / 2}" r="1050" fill="#fff" opacity=".10"/><circle cx="{bx + bw / 2}" cy="{by + bh / 2}" r="760" fill="#fff" opacity=".10"/>
{snow(w, h, 23)}
<ellipse cx="600" cy="2700" rx="1900" ry="640" fill="#D6ECFB"/>
<ellipse cx="3300" cy="2760" rx="1900" ry="700" fill="#E6F3FD"/>
<ellipse cx="1920" cy="2900" rx="2400" ry="640" fill="#fff"/>
{igloo(180, 1820, 420, '#8B6CF6')}
{igloo(3260, 1830, 420, '#FFB800')}
{penguin(700, 1900, 380, '#8B6CF6')}
{penguin(1120, 1990, 420, '#22C58B')}
{penguin(1580, 2080, 360, '#FF8A3D')}
{penguin(2330, 2080, 360, '#FF5470', flip=True)}
{penguin(2740, 1990, 420, '#2E86F5', flip=True)}
<defs><clipPath id="board"><rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="34"/></clipPath></defs>
<rect x="{bx - 14}" y="{by - 14}" width="{bw + 28}" height="{bh + 28}" rx="46" fill="#fff" style="filter:drop-shadow(0 30px 50px rgba(20,40,110,.35))"/>
<image href="file://{BOARD}" x="{bx}" y="{by}" width="{bw}" height="{bh}" clip-path="url(#board)" preserveAspectRatio="none"/>
{wordmark(1440, 1040, 250)}
<text text-anchor="middle" font-size="178" fill="#fff" style="filter:drop-shadow(0 8px 10px rgba(20,40,110,.35))"><tspan x="1440" y="1380">{first}</tspan><tspan x="1440" y="1590">{second}</tspan></text>
'''
    return frame(w, h, body, (836, 765, 2168, 1030) if guides else None)


def board_image(path, x, y, w, h, uid):
    pad = round(w * 0.016)
    return f'''<defs><clipPath id="{uid}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{round(w * 0.04)}"/></clipPath></defs>
<rect x="{x - pad}" y="{y - pad}" width="{w + pad * 2}" height="{h + pad * 2}" rx="{round(w * 0.055)}" fill="#fff" style="filter:drop-shadow(0 {round(h * 0.03)}px {round(h * 0.05)}px rgba(13,24,60,.4))"/>
<image href="file://{path}" x="{x}" y="{y}" width="{w}" height="{h}" clip-path="url(#{uid})" preserveAspectRatio="none"/>'''


def preview(lang, index, portrait):
    """Önizleme görseli: başlık + oyundan gerçek bir tahta + penguenler. 886×1920 (dikey) ya da 1920×886 (yatay)."""
    path, ratio, night, captions = PREVIEWS[index]
    first, second = captions[lang]
    hills = ('#1E3266', '#27407C', '#33529A') if night else ('#D6ECFB', '#E6F3FD', '#FFFFFF')
    shadow = 'filter:drop-shadow(0 5px 7px rgba(13,24,60,.4))'
    if portrait:
        w, h = 886, 1920
        bw = 770
        bh = round(bw / ratio)
        bx, by = (w - bw) // 2, 470
        body = f'''
{snow(w, h, 31 + index)}
<ellipse cx="120" cy="2040" rx="620" ry="330" fill="{hills[0]}"/><ellipse cx="800" cy="2060" rx="620" ry="350" fill="{hills[1]}"/><ellipse cx="443" cy="2130" rx="760" ry="330" fill="{hills[2]}"/>
{penguin(110, 1450, 210, '#22C58B')}{penguin(338, 1480, 210, '#FF8A3D')}{penguin(566, 1450, 210, '#FF5470', flip=True)}
<text text-anchor="middle" font-size="82" fill="#fff" style="{shadow}"><tspan x="{w / 2}" y="250">{first}</tspan><tspan x="{w / 2}" y="350">{second}</tspan></text>
{board_image(path, bx, by, bw, bh, 'clip')}
{wordmark(w / 2, 1830, 120)}'''
    else:
        w, h = 1920, 886
        bh = 770
        bw = round(bh * ratio)
        bx, by = 1130, (h - bh) // 2
        cx = 565
        body = f'''
{snow(w, h, 51 + index)}
<ellipse cx="300" cy="1000" rx="900" ry="300" fill="{hills[0]}"/><ellipse cx="1700" cy="1020" rx="900" ry="300" fill="{hills[1]}"/><ellipse cx="900" cy="1080" rx="1200" ry="300" fill="{hills[2]}"/>
{penguin(cx - 330, 590, 200, '#22C58B')}{penguin(cx - 100, 610, 200, '#FF8A3D')}{penguin(cx + 130, 590, 200, '#8B6CF6', flip=True)}
{wordmark(cx, 250, 170)}
<text text-anchor="middle" font-size="76" fill="#fff" style="{shadow}"><tspan x="{cx}" y="420">{first}</tspan><tspan x="{cx}" y="512">{second}</tspan></text>
{board_image(path, bx, by, bw, bh, 'clip')}'''
    return frame(w, h, body, night=night), w, h


def render(html, width, height, path):
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, 'page.html')
        shot = os.path.join(tmp, 'shot.png')
        with open(page, 'w') as f:
            f.write(html)
        subprocess.run(
            [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
             f'--window-size={width},{height}', '--allow-file-access-from-files', f'--screenshot={shot}', 'file://' + page],
            check=True, capture_output=True,
        )
        image = Image.open(shot).convert('RGB')  # saydamlık yok
        assert image.size == (width, height), image.size
        os.makedirs(os.path.dirname(path), exist_ok=True)
        image.save(path, optimize=True)
        return image


def main():
    guides = '--guides' in sys.argv
    for lang in TAGLINE:
        folder = os.path.join(OUT, lang)
        suffix = '-guides' if guides else ''
        render(header(lang, guides), 3840, 1646, os.path.join(folder, f'header-3840x1646{suffix}.png'))
        big = render(search(lang, guides), 3840, 2560, os.path.join(folder, f'search-3840x2560{suffix}.png'))
        if not guides:
            big.resize((1920, 1280), Image.LANCZOS).save(os.path.join(folder, 'search-1920x1280.png'), optimize=True)
            for index in range(len(PREVIEWS)):
                for portrait in (True, False):
                    html, w, h = preview(lang, index, portrait)
                    render(html, w, h, os.path.join(folder, f'preview-{index + 1}-{w}x{h}.png'))
        print(folder)


if __name__ == '__main__':
    main()
