#!/usr/bin/env python3
"""
Tanıtım sayfalarını üretir (geliştirici aracı): docs/1.0/tr/index.html ve
docs/1.0/en/index.html. İki dil aynı iskeleti paylaşır; metinler aşağıdaki
sözlüklerde durur. Kıta çizimleri satır içi SVG'dir, ek görsel dosyası gerekmez.

  python3 scripts/make-site.py

Gizlilik ve destek sayfaları elle yazılır; bu betik onlara dokunmaz.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs', '1.0')

# Addaki harflerin renkleri (uygulamadaki Wordmark ile aynı sıra).
LETTER_COLORS = ['#2E86F5', '#FF8A3D', '#FF5470', '#FFB800', '#22C58B', '#8B6CF6']


def wordmark():
    letters = ''.join(
        f'<span style="color:{LETTER_COLORS[i % len(LETTER_COLORS)]}">{ch}</span>' for i, ch in enumerate('Pengolo')
    )
    return f'<span class="wordmark" aria-label="Pengolo">{letters}</span>'


# Bütün çizimlerin paylaştığı penguen (100×110 birimlik kutu). Atkı rengi `color` ile verilir.
PENGUIN_SYMBOL = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="peng" viewBox="0 0 100 110">
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
</symbol></defs></svg>'''


def scene(key, sky, body, penguin_x, scarf, hat, label):
    """Kıta kartının üst resmi: gökyüzü geçişi + manzara + şapkalı penguen."""
    gid = 'sky-' + key
    return f'''<svg class="scene" viewBox="0 0 320 190" role="img" aria-label="{label}" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sky[0]}"/><stop offset="1" stop-color="{sky[1]}"/></linearGradient></defs>
<rect width="320" height="190" fill="url(#{gid})"/>
{body}
<g transform="translate({penguin_x} 82) scale(0.92)" style="color:{scarf}"><use href="#peng" width="100" height="110"/>{hat}</g>
</svg>'''


SCENES = {
    'antarctica': dict(
        sky=('#8FE3F5', '#5AA9FF'),
        body='''<circle cx="40" cy="30" r="3" fill="#fff" opacity=".9"/><circle cx="110" cy="52" r="2.2" fill="#fff" opacity=".8"/><circle cx="262" cy="26" r="2.6" fill="#fff" opacity=".9"/><circle cx="296" cy="70" r="2" fill="#fff" opacity=".8"/><circle cx="170" cy="22" r="2" fill="#fff" opacity=".8"/>
<ellipse cx="70" cy="196" rx="170" ry="62" fill="#D6ECFB"/><ellipse cx="270" cy="204" rx="190" ry="58" fill="#fff"/>
<path d="M214 150a34 34 0 0 1 68 0z" fill="#F2F8FF" stroke="#C4DDF3" stroke-width="3"/><path d="M240 150v-13a8 8 0 0 1 16 0v13z" fill="#33477F"/>
<path d="M248 116v-22" stroke="#33477F" stroke-width="3" stroke-linecap="round"/><path d="M248 94l17 6-17 6z" fill="#2E86F5"/>''',
        penguin_x=58, scarf='#2E86F5',
        hat='<path d="M22 32Q50-6 78 32z" fill="#2E86F5"/><rect x="18" y="27" width="64" height="11" rx="5.5" fill="#1B63C4"/><circle cx="50" cy="8" r="7" fill="#CFE4FF"/>',
    ),
    'desert': dict(
        sky=('#FFE1A8', '#FF9D5C'),
        body='''<circle cx="258" cy="46" r="24" fill="#FFF3C4"/><circle cx="258" cy="46" r="34" fill="#FFF3C4" opacity=".35"/>
<path d="M176 150l44-64 44 64z" fill="#E7B15C"/><path d="M220 86l44 64h-30z" fill="#C98F3E"/>
<ellipse cx="60" cy="200" rx="190" ry="62" fill="#F3C980"/><ellipse cx="270" cy="206" rx="180" ry="56" fill="#E5AC5C"/>
<g fill="#2FA36B"><rect x="282" y="110" width="12" height="46" rx="6"/><rect x="268" y="124" width="10" height="20" rx="5"/><rect x="268" y="136" width="20" height="9" rx="4.5"/><rect x="298" y="118" width="10" height="20" rx="5"/><rect x="290" y="130" width="18" height="9" rx="4.5"/></g>''',
        penguin_x=50, scarf='#FF8A3D',
        hat='<ellipse cx="50" cy="30" rx="40" ry="8" fill="#C79A5B"/><path d="M27 30Q30 4 50 4T73 30z" fill="#DDB678"/><rect x="27" y="22" width="46" height="6" fill="#8A5A2B"/>',
    ),
    'europe': dict(
        sky=('#CDEBFF', '#8FCBFF'),
        body='''<ellipse cx="60" cy="36" rx="30" ry="11" fill="#fff" opacity=".9"/><ellipse cx="86" cy="42" rx="22" ry="9" fill="#fff" opacity=".9"/>
<ellipse cx="250" cy="204" rx="200" ry="72" fill="#7FD08A"/><ellipse cx="50" cy="208" rx="180" ry="62" fill="#55B96E"/>
<g><rect x="232" y="78" width="34" height="66" fill="#F4E7D3"/><path d="M226 80l23-30 23 30z" fill="#E0554A"/><rect x="243" y="118" width="12" height="26" rx="6" fill="#8A5A2B"/><rect x="243" y="92" width="12" height="13" rx="2" fill="#7FB8E6"/>
<rect x="270" y="100" width="24" height="44" fill="#EADBC4"/><path d="M266 102l16-20 16 20z" fill="#C8463C"/></g>
<g fill="#FF5470"><circle cx="196" cy="160" r="5"/><circle cx="212" cy="166" r="5"/><circle cx="304" cy="162" r="5"/></g><g fill="#FFC93C"><circle cx="204" cy="172" r="4"/><circle cx="292" cy="170" r="4"/></g>''',
        penguin_x=52, scarf='#FF5470',
        hat='<ellipse cx="54" cy="24" rx="31" ry="11" fill="#E0354F"/><ellipse cx="50" cy="29" rx="24" ry="5" fill="#B82840"/><rect x="60" y="6" width="4" height="10" rx="2" fill="#B82840"/>',
    ),
    'americas': dict(
        sky=('#FFC9A8', '#FF7F7A'),
        body='''<circle cx="70" cy="60" r="20" fill="#FFE6A8" opacity=".9"/>
<path d="M182 150v-58h20v-18h34v18h14v58z" fill="#C6533C"/><path d="M236 92h14v58h-14z" fill="#A53F2C"/>
<path d="M262 150v-36h40v36z" fill="#B5472F"/><path d="M292 114h10v36h-10z" fill="#96361F"/>
<ellipse cx="80" cy="204" rx="200" ry="62" fill="#E08A55"/><ellipse cx="270" cy="210" rx="170" ry="56" fill="#CC6E3E"/>
<g fill="#2FA36B"><rect x="150" y="118" width="11" height="40" rx="5.5"/><rect x="138" y="128" width="9" height="18" rx="4.5"/><rect x="138" y="138" width="18" height="8" rx="4"/></g>''',
        penguin_x=40, scarf='#FFB800',
        hat='<path d="M6 32q44 12 88 0-10-9-22-9H28q-12 0-22 9z" fill="#8A5A2B"/><path d="M28 26Q26 2 42 6q8 3 16 0 16-4 14 20z" fill="#A66E38"/><rect x="28" y="20" width="44" height="5" fill="#FFC93C"/>',
    ),
    'asia': dict(
        sky=('#FFD9EA', '#C8B4FF'),
        body='''<path d="M150 150l62-92 62 92z" fill="#8E86D6"/><path d="M212 58l-20 30 10-5 10 8 10-8 10 5z" fill="#fff"/>
<ellipse cx="70" cy="204" rx="200" ry="62" fill="#9BD3A0"/><ellipse cx="270" cy="210" rx="170" ry="56" fill="#74BF85"/>
<g><rect x="264" y="112" width="30" height="34" fill="#F4E7D3"/><path d="M252 114q27-10 54 0l-6-12h-42z" fill="#D8433A"/><rect x="270" y="88" width="18" height="16" fill="#F4E7D3"/><path d="M260 90q19-9 38 0l-5-10h-28z" fill="#D8433A"/><rect x="275" y="126" width="8" height="20" fill="#8A5A2B"/></g>
<g fill="#FF9EC4"><circle cx="34" cy="40" r="5"/><circle cx="52" cy="28" r="4"/><circle cx="24" cy="66" r="4"/><circle cx="130" cy="34" r="4"/><circle cx="302" cy="46" r="5"/><circle cx="286" cy="64" r="3.5"/></g>''',
        penguin_x=44, scarf='#22C58B',
        hat='<path d="M4 34L50 4l46 30z" fill="#E9CB7C"/><path d="M4 34q46 9 92 0" fill="none" stroke="#C9A64E" stroke-width="3"/>',
    ),
    'oceania': dict(
        sky=('#A6ECF4', '#56C6EC'),
        body='''<circle cx="266" cy="42" r="20" fill="#FFF3C4"/>
<rect y="128" width="320" height="62" fill="#2FA7DB"/><path d="M0 132q20-8 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0v10H0z" fill="#7FD4F0"/>
<ellipse cx="96" cy="196" rx="170" ry="46" fill="#F6DFA4"/>
<path d="M244 150q4-38-6-66" fill="none" stroke="#8A5A2B" stroke-width="7" stroke-linecap="round"/>
<g fill="#2FA36B"><path d="M238 84q-30-14-48 6 28-6 48-6z"/><path d="M238 84q30-16 50 2-28-4-50-2z"/><path d="M238 84q-14-28-40-22 24 6 40 22z"/><path d="M238 84q12-28 40-24-24 8-40 24z"/></g>
<rect x="150" y="96" width="12" height="62" rx="6" fill="#FF5470" transform="rotate(12 156 127)"/><rect x="154" y="100" width="4" height="54" rx="2" fill="#fff" opacity=".7" transform="rotate(12 156 127)"/>''',
        penguin_x=36, scarf='#8B6CF6',
        hat='<rect x="26" y="40" width="21" height="13" rx="5" fill="#1A2340"/><rect x="53" y="40" width="21" height="13" rx="5" fill="#1A2340"/><rect x="45" y="44" width="10" height="4" fill="#1A2340"/><g fill="#FF8A3D"><circle cx="72" cy="20" r="5"/><circle cx="80" cy="26" r="5"/><circle cx="72" cy="31" r="5"/><circle cx="64" cy="26" r="5"/></g><circle cx="72" cy="26" r="3.5" fill="#FFC93C"/>',
    ),
}

ORDER = ['antarctica', 'desert', 'europe', 'americas', 'asia', 'oceania']

TEXT = {
    'tr': dict(
        lang='tr', other='en', other_label='English', other_lang='en',
        title='Pengolo — penguenlerle dünya turu bulmacası',
        desc='Penguene dokun, bir şeye çarpana kadar kaysın. Yolculuk Antarktika’da 90 bulmacayla başlıyor; sırada bütün dünya var.',
        nav=('Ana sayfa', 'Destek', 'Gizlilik'),
        tagline='Kay. Çarp.<br>Yuvana dön.',
        lead='Buzda başlayan sıcacık bir bulmaca yolculuğu. Penguene dokun; bir şeye çarpana kadar kayar. Herkesi yuvasına ulaştır, sonra bir sonraki kıtaya yelken aç.',
        cta='Yakında App Store’da',
        facts=['90 bulmaca', 'Günlük bulmaca', 'İki kişilik düello', 'İnternetsiz oynanır', 'Gündüz ve gece teması', 'Türkçe &amp; English'],
        alt_home='Bereli ve gökkuşağı atkılı penguenle ana ekran', alt_home_night='Gece temasında ana ekran',
        tour_kicker='Büyük plan', tour_title='Önce Antarktika.<br>Sonra bütün dünya.',
        tour_lead='Penguenler evlerinden yola çıkıyor. Buzullar yalnızca ilk durak: her kıta kendi manzarasını, kendi renklerini ve kendine özgü bulmacalarını getirecek. Antarktika’yı bitiren için yol hiç bitmiyor.',
        now='Şimdi oynanıyor', soon='Yakında', stop='{n}. durak',
        places=dict(
            antarctica=('Antarktika', 'Yolculuğun başladığı yer. Üç macera, 90 bulmaca: kaygan buz, bir kez taşıyan çatlak buz ve uyandırılmayı bekleyen uykucular.'),
            desert=('Çöl', 'Kızgın kumlar, serin vahalar, uzakta bir piramit. Penguenler atkılarını çıkarmadan kum tepelerinden kayacak.'),
            europe=('Avrupa', 'Yeşil tepeler, taş kuleler, lale tarlaları. Dar sokaklarda doğru sırayı bulmak daha da tatlı olacak.'),
            americas=('Amerika', 'Kızıl kanyonlar ve uçsuz bucaksız ovalar. Gün batımında yuvaya dönen bir sürü kovboy şapkalı penguen.'),
            asia=('Asya', 'Kiraz çiçekleri, karlı zirveler, kırmızı çatılı tapınaklar. Sakin görünen ama iyi düşünülmesi gereken bulmacalar.'),
            oceania=('Okyanusya', 'Palmiyeler, mercan adaları ve dalga sesi. Yolculuğun en güneşli durağı.'),
        ),
        tour_note='Yeni kıtalar güncellemelerle gelecek. Durakların sırası ve içeriği yol boyunca değişebilir.',
        how_title='Nasıl oynanır?',
        features=[
            ('02-level', 'Buz tahtasında beş penguenli bir bulmaca', 'Tek dokunuş, tek kayış', 'Penguenler ancak bir şeye çarpınca durur. Bulmaca sıradadır: kim önce gidecek, kim bekleyecek, kim bir başkasının ihtiyaç duyduğu duvar olacak.'),
            ('03-map', 'Numaralı bölümleriyle Antarktika haritası', 'Haritada adım adım', 'Her kıta bir harita, her harita onlarca durak. Her macera yeni bir kural getirir; kural birkaç saniyede, tek satır yazı olmadan gösterilir.'),
            ('05-cracked', 'Çatlak buzlu bir bulmaca', 'Bir kez taşıyan buz', 'Çatlak buz arkandan suya döner. Bazen tuzaktır. Bazen de onu bilerek kırmak işin bütün püf noktasıdır.'),
            ('06-sleepy', 'Uyuyan penguenli bir bulmaca', 'Uykucuları uyandır', 'Uyuyan penguen, biri ona çarpana kadar yalnızca bir engeldir. Uyanınca onun da gideceği bir yuvası vardır.'),
            ('07-duel', 'Bilgisayara karşı düello', 'Tek telefonda düello', 'Arkadaşınla aynı cihazda karşı karşıya oyna ya da üç zorlukta bilgisayara meydan oku. Üç oyun kazanan alır.'),
            ('08-profile', 'Penguen için şapkaların olduğu gardırop', 'Pengueni kendin yap', 'Şapkalar, saçlar, gözlükler ve çok gösterişli bir gökkuşağı atkı; hepsi oynayarak kazandığın coinlerle. Hepsi yalnızca görünüm; hiçbiri avantaj satın almaz.'),
        ],
        night_kicker='İkinci tema', night_title='Gece çökünce kutup ışıkları',
        night_lead='Güneş batınca Pengolo da geceye geçer: lacivert bir gökyüzü, yeşil-mor kutup ışıkları ve usul usul yağan kar. Tema telefonunun ayarını izler; istersen her zaman gece ya da her zaman gündüz kalır.',
        night_alts=dict(home='Gece temasında ana ekran', level='Gece temasında bir bulmaca', map='Gece temasında Antarktika haritası', cracked='Gece temasında çatlak buzlu bulmaca', duel='Gece temasında düello', profile='Gece temasında gardırop', daily='Gece temasında günlük bulmaca', sleepy='Gece temasında uykucu penguenli bulmaca'),
        more_title='Oyundan daha fazlası',
        more_alts=('Üç yıldızlı bölüm sonu kartı', 'Coin paketleri ve paketlerin olduğu mağaza', 'Günlük bulmaca', 'Bereli ve gökkuşağı atkılı penguenle ana ekran'),
        end_title='Bavulunu hazırla.', end_lead='İlk durak Antarktika. Gerisi yolda.',
        footer='© 2026 Serhat Önal · Üşüyen ayaklar ve sıcak iglolar için özenle yapıldı.',
    ),
    'en': dict(
        lang='en', other='tr', other_label='Türkçe', other_lang='tr',
        title='Pengolo — a penguin puzzle trip around the world',
        desc='Tap a penguin and it glides until something stops it. The journey starts with 90 puzzles in Antarctica; the rest of the world is next.',
        nav=('Home', 'Support', 'Privacy'),
        tagline='Slide. Bump.<br>Come home.',
        lead='A cosy puzzle journey that starts on the ice. Tap a penguin and it glides until something stops it. Get everyone home, then set sail for the next continent.',
        cta='Coming soon to the App Store',
        facts=['90 puzzles', 'Daily puzzle', 'Two-player duels', 'Plays offline', 'Day and night themes', 'English &amp; Türkçe'],
        alt_home='Home screen with a penguin in a beanie and rainbow scarf', alt_home_night='Home screen in the night theme',
        tour_kicker='The big plan', tour_title='First Antarctica.<br>Then the whole world.',
        tour_lead='The penguins are leaving home. The glaciers are only the first stop: every continent will bring its own scenery, its own colours and puzzles of its own. Finish Antarctica and the road just keeps going.',
        now='Playable now', soon='Coming soon', stop='Stop {n}',
        places=dict(
            antarctica=('Antarctica', 'Where the journey begins. Three episodes, 90 puzzles: slippery ice, cracked ice that holds only once, and sleepy penguins waiting for a nudge.'),
            desert=('The Desert', 'Hot sand, cool oases, a pyramid on the horizon. The penguins will slide down the dunes without taking their scarves off.'),
            europe=('Europe', 'Green hills, stone towers, fields of tulips. Finding the right order is even sweeter in narrow streets.'),
            americas=('The Americas', 'Red canyons and endless plains. A whole flock of penguins in cowboy hats heading home at sunset.'),
            asia=('Asia', 'Cherry blossom, snowy peaks, red-roofed temples. Puzzles that look calm and reward a good think.'),
            oceania=('Oceania', 'Palm trees, coral islands and the sound of waves. The sunniest stop of the trip.'),
        ),
        tour_note='New continents will arrive in updates. The order and contents of the stops may change along the way.',
        how_title='How it plays',
        features=[
            ('02-level', 'A puzzle with five penguins on an ice board', 'One tap, one glide', 'Penguins only stop when they bump into something. The puzzle is the order: who goes first, who waits, and who becomes the wall someone else needs.'),
            ('03-map', 'The map of Antarctica with numbered levels', 'Step by step across the map', 'Every continent is a map, every map has dozens of stops. Each episode adds one new rule, shown in a few seconds without a line of text.'),
            ('05-cracked', 'A puzzle with cracked ice', 'Ice that holds only once', 'Cracked ice turns to water behind you. Sometimes it is a trap. Sometimes breaking it on purpose is the whole trick.'),
            ('06-sleepy', 'A puzzle with a sleeping penguin', 'Wake up the sleepy ones', 'A sleeping penguin is just an obstacle until someone bumps into it. Once awake, it has a home of its own to reach.'),
            ('07-duel', 'A duel against the computer', 'Duels on one phone', 'Play a friend face to face on the same device, or take on the computer at three difficulty levels. First to three wins.'),
            ('08-profile', 'The wardrobe with hats for the penguin', 'Make the penguin yours', 'Hats, hair, glasses and a very showy rainbow scarf, all bought with coins you earn by playing. Everything is cosmetic; nothing buys an advantage.'),
        ],
        night_kicker='The second theme', night_title='Northern lights after dark',
        night_lead='When the sun goes down, Pengolo follows: a deep blue sky, green and purple lights, and quiet falling snow. The theme follows your phone’s setting, or you can keep it on night or day all the time.',
        night_alts=dict(home='Home screen in the night theme', level='A puzzle in the night theme', map='The map of Antarctica in the night theme', cracked='A cracked-ice puzzle in the night theme', duel='A duel in the night theme', profile='The wardrobe in the night theme', daily='The daily puzzle in the night theme', sleepy='A sleepy-penguin puzzle in the night theme'),
        more_title='More from the game',
        more_alts=('Level-complete card with three stars', 'The shop with coin packs and bundles', 'The daily puzzle', 'Home screen with a penguin in a beanie and rainbow scarf'),
        end_title='Pack your bags.', end_lead='First stop: Antarctica. The rest is on the way.',
        footer='© 2026 Serhat Önal · Made with care for cold feet and warm igloos.',
    ),
}

NIGHT = [('01-home', 'home'), ('02-level', 'level'), ('03-map', 'map'), ('07-duel', 'duel'), ('08-profile', 'profile'), ('05-cracked', 'cracked'), ('10-daily', 'daily')]


def shot(lang, name, alt, cls='shot', lazy=True):
    lazy_attr = ' loading="lazy"' if lazy else ''
    return f'<img class="{cls}" src="../assets/shots/{lang}/{name}.jpg" alt="{alt}" width="660" height="1434"{lazy_attr}>'


def page(t):
    lang = t['lang']
    cards = []
    for index, key in enumerate(ORDER):
        name, body = t['places'][key]
        live = key == 'antarctica'
        badge = f'<span class="badge {"live" if live else "soon"}">{t["now"] if live else t["soon"]}</span>'
        cards.append(
            f'''  <li class="stop{" live" if live else ""}">
    {scene(key, label=name, **SCENES[key])}
    <div class="stop-body"><span class="stop-no">{t["stop"].format(n=index + 1)}</span>{badge}<h3>{name}</h3><p>{body}</p></div>
  </li>'''
        )
    features = '\n'.join(
        f'''  <article class="feature">
    {shot(lang, name, alt)}
    <div><h3>{title}</h3><p>{body}</p></div>
  </article>'''
        for name, alt, title, body in t['features']
    )
    night = '\n'.join('    ' + shot(lang, 'night-' + name, t['night_alts'][key], cls='') for name, key in NIGHT)
    more = '\n'.join(
        '    ' + shot(lang, name, alt, cls='')
        for name, alt in zip(('04-complete', '09-shop', '10-daily', '01-home'), t['more_alts'])
    )
    facts = ''.join(f'<li>{fact}</li>' for fact in t['facts'])
    home, support, privacy = t['nav']
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{t["title"]}</title>
<meta name="description" content="{t["desc"]}">
<meta property="og:title" content="{t["title"]}">
<meta property="og:description" content="{t["desc"]}">
<meta property="og:image" content="https://serhaton.com/pengolo/assets/og-{lang}.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../assets/icon.png">
<link rel="apple-touch-icon" href="../assets/icon.png">
<link rel="alternate" hreflang="{t["other"]}" href="../{t["other"]}/index.html">
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
{PENGUIN_SYMBOL}
<header class="wrap top">
  <a class="brand" href="index.html"><img src="../assets/icon.png" alt="" width="44" height="44">{wordmark()}</a>
  <nav class="nav" aria-label="Pengolo">
    <a href="index.html" aria-current="page">{home}</a>
    <a href="support.html">{support}</a>
    <a href="privacy.html">{privacy}</a>
    <a class="lang" href="../{t["other"]}/index.html" lang="{t["other_lang"]}">{t["other_label"]}</a>
  </nav>
</header>
<main>
<section class="wrap hero">
  <div>
    <p class="hero-mark">{wordmark()}</p>
    <h1>{t["tagline"]}</h1>
    <p class="lead">{t["lead"]}</p>
    <span class="cta soon">{t["cta"]}</span>
    <ul class="facts">{facts}</ul>
  </div>
  <div class="duo">
    {shot(lang, 'night-01-home', t['alt_home_night'], cls='shot back', lazy=False)}
    {shot(lang, '01-home', t['alt_home'], cls='shot front', lazy=False)}
  </div>
</section>

<section class="tour">
  <div class="wrap">
    <p class="kicker">{t["tour_kicker"]}</p>
    <h2 class="big">{t["tour_title"]}</h2>
    <p class="section-lead">{t["tour_lead"]}</p>
    <ol class="stops">
{chr(10).join(cards)}
    </ol>
    <p class="note">{t["tour_note"]}</p>
  </div>
</section>

<section class="wrap">
  <h2 class="section-title">{t["how_title"]}</h2>
  <div class="features">
{features}
  </div>
</section>

<section class="night">
  <div class="wrap">
    <p class="kicker">{t["night_kicker"]}</p>
    <h2 class="big">{t["night_title"]}</h2>
    <p class="section-lead">{t["night_lead"]}</p>
  </div>
  <div class="gallery wrap">
{night}
  </div>
</section>

<section>
  <div class="wrap"><h2 class="section-title">{t["more_title"]}</h2></div>
  <div class="gallery wrap">
{more}
  </div>
</section>

<section class="wrap">
  <div class="finale">
    <svg viewBox="0 0 100 110" width="120" height="132" aria-hidden="true" style="color:#2E86F5"><use href="#peng"/></svg>
    <h2 class="big">{t["end_title"]}</h2>
    <p class="section-lead">{t["end_lead"]}</p>
    <span class="cta soon">{t["cta"]}</span>
  </div>
</section>
</main>
<footer class="wrap">
  <span class="grow">{t["footer"]}</span>
  <a href="support.html">{support}</a>
  <a href="privacy.html">{privacy}</a>
</footer>
</body>
</html>
'''


def main():
    for lang, text in TEXT.items():
        path = os.path.join(DOCS, lang, 'index.html')
        with open(path, 'w') as f:
            f.write(page(text))
        print(path)


if __name__ == '__main__':
    main()
