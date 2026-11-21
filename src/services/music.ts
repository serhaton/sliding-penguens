/**
 * Fon müziği. Ana ekranda ve menülerde ana tema, bölüm oynanırken o bölgenin
 * kendi ezgisi çalar. Ekranlar expo-audio'yu doğrudan çağırmaz:
 *
 *   music.start()         // uygulama açılışında bir kez: ana tema başlar
 *   const release = music.play('shore')   // bölüm ekranı: bu bölgenin ezgisi
 *   release()                             // bölümden çıkış: ana temaya dönülür
 *   music.hold(true)      // reklam süresince sus; hold(false) ile devam
 *
 * Çalıp çalmayacağına servis karar verir. Müzik şu durumlarda susar:
 *  - Ayarlar'da "Müzik" kapalıysa,
 *  - oyuncu başka bir uygulamadan müzik dinliyorsa (üstüne binmesin),
 *  - telefon sessizdeyse (ses oturumu sessiz anahtarına uyar),
 *  - reklam gösterilirken,
 *  - uygulama arka plandayken: arka planda ses çalınmaz, arka plan modu da
 *    bildirilmez (App Review 2.5.4).
 *
 * Ses düzeyi dosyaların içindedir (bkz. scripts/generate-placeholder-sounds.mjs).
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';

import { useSettings } from '@/store/settings';

import native from '../../modules/game-center/src/PenguinGameCenterModule';
import { configureAudio } from './audio';

const TRACKS = {
  home: require('../../assets/sounds/music-home.wav'),
  shore: require('../../assets/sounds/music-shore.wav'),
  spin: require('../../assets/sounds/music-spin.wav'),
  waves: require('../../assets/sounds/music-waves.wav'),
  thin: require('../../assets/sounds/music-thin.wav'),
  pass: require('../../assets/sounds/music-pass.wav'),
  lake: require('../../assets/sounds/music-lake.wav'),
  valley: require('../../assets/sounds/music-valley.wav'),
  snore: require('../../assets/sounds/music-snore.wav'),
  dream: require('../../assets/sounds/music-dream.wav'),
} as const;

export type MusicTrack = keyof typeof TRACKS;

/** Menülerde çalan parça. */
const HOME: MusicTrack = 'home';

/** Yüklü oynatıcılar: ana tema hep durur, bölge ezgilerinden yalnızca sonuncusu. */
const players = new Map<MusicTrack, AudioPlayer>();
/** Şu an çalan (ya da duraklatılmış) parça. */
let current: MusicTrack | null = null;
/** Bölüm ekranının istediği parça; `null` = menüdeyiz. */
let level: MusicTrack | null = null;
/** Bölge ezgisini en son isteyen ekranın kimliği: yalnızca o bırakabilir. */
let owner = 0;
/** Bölümden çıkınca ana temaya dönmeden önce beklenen süre (ms). */
const RELEASE_MS = 250;
let started = false;
let held = false;

/** Başka bir uygulama ses çalıyor mu? Bilinemiyorsa "hayır" sayılır. */
function otherAudioPlaying(): boolean {
  try {
    return native?.isOtherAudioPlaying?.() ?? false;
  } catch {
    return false;
  }
}

function playerFor(track: MusicTrack): AudioPlayer {
  let player = players.get(track);
  if (!player) {
    // Eski bölge ezgisi bellekten atılır: aynı anda en fazla iki parça yüklü kalır.
    for (const [name, old] of players) {
      if (name !== HOME && name !== track) {
        old.remove();
        players.delete(name);
      }
    }
    configureAudio();
    player = createAudioPlayer(TRACKS[track]);
    player.loop = true;
    players.set(track, player);
  }
  return player;
}

/** İstenen duruma getirir: doğru parça çalıyor ya da susuyor. Asla hata fırlatmaz. */
function apply(): void {
  try {
    const wanted = level ?? HOME;
    const should =
      started && !held && AppState.currentState === 'active' && useSettings.getState().music && !otherAudioPlaying();
    if (current && (!should || current !== wanted)) players.get(current)?.pause();
    if (!should) return;
    current = wanted;
    playerFor(wanted).play();
  } catch {
    // Ses asla oyunu bozmamalı.
  }
}

export const music = {
  /** Uygulama açılışında bir kez çağrılır; ana tema başlar. */
  start(): void {
    if (started) return;
    started = true;
    // Ayar değişince ve uygulama öne ya da arkaya geçince durum yeniden kurulur.
    useSettings.subscribe((now, before) => {
      if (now.music !== before.music) apply();
    });
    AppState.addEventListener('change', apply);
    apply();
  },

  /**
   * Bölüm ekranı açıldı: o bölgenin ezgisi çalar. Dönen fonksiyon ekran
   * kapanırken çağrılır ve ana temaya döndürür.
   *
   * Bir bölümden sonrakine geçerken yeni ekran, eskisi kapanmadan önce ya da
   * sonra açılabilir. Bu yüzden yalnızca ezgiyi en son isteyen ekran onu
   * bırakabilir ve bırakma kısa bir süre bekler: araya ana tema girmez.
   */
  play(track: MusicTrack): () => void {
    const token = ++owner;
    level = track;
    apply();
    return () => {
      if (owner !== token) return;
      setTimeout(() => {
        if (owner !== token) return;
        level = null;
        apply();
      }, RELEASE_MS);
    };
  },

  /** Reklam gibi kendi sesi olan bir şey gösterilirken müziği susturur. */
  hold(on: boolean): void {
    held = on;
    apply();
  },
};
