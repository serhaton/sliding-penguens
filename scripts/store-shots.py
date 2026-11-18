#!/usr/bin/env python3
"""
Mağaza ekran görüntülerini simülatörden otomatik alır (geliştirici aracı).

Dokunmadan çalışır: uygulamanın geliştirme sürümündeki uzaktan kumanda
(src/services/devRemote.ts) bu betiğin yazdığı cmd.json dosyasını dinler ve
istenen ekrana gider. Önce dev/seed ile tanıtım verisi yüklenir.

  python3 scripts/store-shots.py <simülatör-udid> <çıktı-klasörü> [--icon]

Gerekenler: Metro çalışıyor olmalı (npx expo start), simülatör açık ve
uygulamanın geliştirme derlemesi kurulu olmalı. YALNIZCA BOŞ BİR SİMÜLATÖRDE
kullan: tanıtım verisi cüzdana gerçek kayıtlar yazar.
"""
import http.server
import json
import os
import subprocess
import sys
import threading
import time

BUNDLE = 'com.serhatonal.slidingpenguins'
PORT = 8799
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def solution(file, index):
    with open(os.path.join(ROOT, 'src', 'data', 'levels', file)) as f:
        return ','.join(json.load(f)[index]['solution'])


# (dosya adı, rota, bekleme saniyesi)
SHOTS = [
    ('01-home', '/', 3),
    ('02-level', '/level/9', 4),
    ('03-map', '/map?overview=1', 5),
    # Bitiş kartı: bölüm çözümüyle oynatılır; rota dile göre complete_route() ile kurulur.
    ('04-complete', None, 22),
    ('05-cracked', '/level/40', 4),
    ('06-sleepy', '/level/66', 4),
    ('07-duel', '/duel/play?mode=cpu&difficulty=medium', 4),
    ('08-profile', '/profile', 4),
    ('09-shop', '/shop', 4),
    ('10-daily', '/daily', 4),
]


# Bitiş kartında coin satırı yalnızca bölüm ilk kez geçilince görünür: her dil ayrı bölüm oynar.
COMPLETE_LEVEL = {'en': 37, 'tr': 38}


def complete_route(level):
    # world2-a.json 33. bölümden başlar.
    return '/level/%d?auto=%s' % (level, solution('world2-a.json', level - 33))


def option(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None


def sim(*args):
    return subprocess.run(['xcrun', 'simctl', *args], capture_output=True, text=True)


class Remote:
    """cmd.json dosyasını sunar; her komutta kimlik artar."""

    def __init__(self, folder):
        self.folder = folder
        self.id = 0
        os.makedirs(folder, exist_ok=True)
        self.write('/')
        handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=folder, **k)
        handler_cls = type('Quiet', (http.server.SimpleHTTPRequestHandler,), {
            '__init__': lambda s, *a, **k: http.server.SimpleHTTPRequestHandler.__init__(s, *a, directory=folder, **k),
            'log_message': lambda *a: None,
        })
        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler_cls)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def write(self, route):
        self.id += 1
        with open(os.path.join(self.folder, 'cmd.json'), 'w') as f:
            json.dump({'id': self.id, 'route': route}, f)

    def go(self, route, wait):
        self.write(route)
        time.sleep(wait)


def main():
    udid, out = sys.argv[1], sys.argv[2]
    icon = '--icon' in sys.argv
    os.makedirs(out, exist_ok=True)
    remote = Remote(os.path.join(out, '.remote'))

    # Geliştirici menüsünün karşılama penceresi ve yüzen düğmesi görüntüye girmesin.
    sim('spawn', udid, 'defaults', 'write', BUNDLE, 'EXDevMenuIsOnboardingFinished', '-bool', 'YES')
    sim('spawn', udid, 'defaults', 'write', BUNDLE, 'EXDevMenuShowFloatingActionButton', '-bool', 'NO')
    sim('status_bar', udid, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100',
        '--wifiBars', '3', '--cellularBars', '4')
    sim('terminate', udid, BUNDLE)
    sim('launch', udid, BUNDLE, '--initialUrl', 'http://localhost:8081')
    time.sleep(30)

    # Seçenekler: --only 04-complete,08-profile · --langs tr · --complete en=38,tr=39
    only = option('--only')
    langs = (option('--langs') or 'en,tr').split(',')
    levels = dict(COMPLETE_LEVEL)
    for pair in (option('--complete') or '').split(','):
        if '=' in pair:
            levels[pair.split('=')[0]] = int(pair.split('=')[1])

    for lang in langs:
        folder = os.path.join(out, lang)
        os.makedirs(folder, exist_ok=True)
        remote.go('/dev/seed?lang=' + lang, 8)
        for name, route, wait in SHOTS:
            if only and name not in only.split(','):
                continue
            remote.go(route or complete_route(levels[lang]), wait)
            result = sim('io', udid, 'screenshot', os.path.join(folder, name + '.png'))
            print(lang, name, 'ok' if result.returncode == 0 else 'HATA: ' + result.stderr.strip(), flush=True)

    if icon:
        remote.go('/dev/icon', 4)
        sim('io', udid, 'screenshot', os.path.join(out, 'icon-scene.png'))
    remote.go('/', 1)


if __name__ == '__main__':
    main()
