#!/usr/bin/env python3
"""
App Store önizleme videolarını simülatörden kaydeder (geliştirici aracı; ffmpeg gerekir).

Dokunmadan çalışır: geliştirme sürümündeki uzaktan kumanda ekranları gezer,
bölümler `?auto=` ile kendi çözümüyle oynanır, düello `?demo=1` ile iki tarafı
da bilgisayarın oynadığı maç olarak gösterilir. Görüntü oyunun kendi ekranıdır.

  python3 scripts/record-previews.py <simülatör-udid> <iphone|ipad> [--langs en,tr] [--only 1,3]

Çıktı: store-previews/<dil>/<cihaz>/preview-N.mp4 (git'e girmez)

Apple'ın ölçüleri (Kasım 2026): iPhone 886×1920, iPad 1200×1600; 15–30 saniye;
H.264 High 4.0, en çok 30 kare/sn, 10–12 Mbps; stereo AAC 256 kbps. Simülatör
ses kaydetmediği için videolara sessiz bir ses izi eklenir.

Gerekenler: Metro çalışıyor olmalı, simülatörde geliştirme derlemesi kurulu olmalı.
Yalnızca tanıtım verisi yüklenebilecek bir simülatörde kullan (dev/seed cüzdana yazar).
"""
import glob
import importlib.util
import json
import os
import signal
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('shots', os.path.join(ROOT, 'scripts', 'store-shots.py'))
shots = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shots)

SIZES = {'iphone': (886, 1920), 'ipad': (1200, 1600)}


def solution(level_id):
    for path in glob.glob(os.path.join(ROOT, 'src', 'data', 'levels', 'world*.json')):
        with open(path) as f:
            for level in json.load(f):
                if level['id'] == str(level_id) and level.get('solution'):
                    return level['solution']
    raise SystemExit(f'{level_id}. bölümün çözümü yok')


def play(level_id, hold=4.0):
    """Bölümü kendi çözümüyle oynatan adım: hamle başına 1,5 sn + kayma, sonra bitiş kartı."""
    moves = solution(level_id)
    return (f'/level/{level_id}?auto={",".join(moves)}', 1.5 + len(moves) * 1.75 + hold)


# Her video: (rota, saniye) adımları. Toplam 15–30 saniye olmalı.
VIDEOS = {
    1: [("/", 2.5), play(9), play(16)],
    2: [play(35), play(62)],
    3: [('/duel/play?mode=cpu&difficulty=hard&demo=1&rival=red', 15.0), ('/map?overview=1', 5.0), ('/profile', 4.5)],
}


def record(udid, steps, raw):
    recorder = subprocess.Popen(
        ['xcrun', 'simctl', 'io', udid, 'recordVideo', '--codec=h264', '--force', raw],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(2.0)  # kaydın başlaması
    return recorder


def encode(raw, out, size, start, duration):
    width, height = size
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{start:.2f}', '-i', raw,
         '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
         '-t', f'{duration:.2f}',
         # Genişliğe göre ölçekle, fazla yüksekliği ortadan kırp (telefon oranı birkaç piksel farklıdır).
         '-vf', f'scale={width}:-2:flags=lanczos,crop={width}:{height},fps=30',
         '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
         '-b:v', '10M', '-maxrate', '12M', '-bufsize', '20M',
         '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
         '-movflags', '+faststart', '-shortest', out],
        check=True,
    )


def main():
    udid, device = sys.argv[1], sys.argv[2]
    size = SIZES[device]
    langs = (shots.option('--langs') or 'en,tr').split(',')
    only = [int(n) for n in (shots.option('--only') or '1,2,3').split(',')]
    # Geçici dosyalar proje dışında durur: proje içine yazmak Metro'yu tetikler ve
    # kayda "Refreshing…" şeridi girer. Bu yüzden videolar da en sonda kodlanır.
    work = os.path.join(tempfile.gettempdir(), 'pengolo-previews')
    os.makedirs(work, exist_ok=True)
    remote = shots.Remote(os.path.join(work, 'remote'))

    shots.sim('spawn', udid, 'defaults', 'write', shots.BUNDLE, 'EXDevMenuIsOnboardingFinished', '-bool', 'YES')
    shots.sim('spawn', udid, 'defaults', 'write', shots.BUNDLE, 'EXDevMenuShowFloatingActionButton', '-bool', 'NO')
    shots.sim('status_bar', udid, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100',
              '--wifiBars', '3', '--cellularBars', '4')
    shots.sim('terminate', udid, shots.BUNDLE)
    shots.sim('launch', udid, shots.BUNDLE, '--initialUrl', 'http://localhost:8081')
    time.sleep(30)

    pending = []
    for lang in langs:
        remote.go('/dev/seed?lang=' + lang, 8)
        for number in only:
            steps = VIDEOS[number]
            total = sum(seconds for _, seconds in steps)
            assert 15 <= total <= 30, (number, total)
            remote.go('/', 2.5)
            raw = os.path.join(work, f'{device}-{lang}-{number}.mov')
            # Videonun ilk karesi ilk adımın ekranı olsun diye önce oraya gidilir, sonra kayıt başlar.
            first_route, first_seconds = steps[0]
            if first_route == '/':
                recorder = record(udid, steps, raw)
                started = time.time()
                time.sleep(first_seconds)
            else:
                recorder = record(udid, steps, raw)
                started = time.time()
                remote.go(first_route, first_seconds)
            for route, seconds in steps[1:]:
                remote.go(route, seconds)
            elapsed = time.time() - started
            recorder.send_signal(signal.SIGINT)
            recorder.wait(timeout=30)
            pending.append((raw, lang, number, elapsed))
    remote.go('/', 1)
    for raw, lang, number, elapsed in pending:
        out = os.path.join(ROOT, 'store-previews', lang, device, f'preview-{number}.mp4')
        # Kaydın ilk 2 saniyesi bekleme payıdır; video ilk adımla başlar.
        encode(raw, out, size, 2.0, min(29.5, elapsed))
        print(lang, device, number, f'{elapsed:.1f}s', flush=True)


if __name__ == '__main__':
    main()
