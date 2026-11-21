/**
 * Ses servisi. Ekranlar expo-audio'yu doğrudan çağırmaz: "Ses efektleri" ayarı
 * tek yerden uygulanır ve ses dosyaları tek yerde eşlenir.
 *
 * Dosyalar şimdilik yer tutucu (bkz. assets/sounds/README.md); gerçeği aynı
 * adla gelince burada değişiklik gerekmez.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useSettings } from '@/store/settings';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  slide: require('../../assets/sounds/slide.wav'),
  bump: require('../../assets/sounds/bump.wav'),
  enter: require('../../assets/sounds/enter.wav'),
  win: require('../../assets/sounds/win.wav'),
  star: require('../../assets/sounds/star.wav'),
  nope: require('../../assets/sounds/nope.wav'),
  crack: require('../../assets/sounds/crack.wav'),
  wake: require('../../assets/sounds/wake.wav'),
  tick: require('../../assets/sounds/tick.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

// Sesler arasındaki denge dosyaların içindedir (bkz.
// scripts/generate-placeholder-sounds.mjs, GAIN): oynatıcının `volume` ayarı
// cihazda duyulur bir fark yaratmadığı için burada ses düzeyi verilmez.

const players = new Map<SoundName, AudioPlayer>();

/**
 * Çark tıkı art arda çok hızlı çalınır (saniyede 20'den fazla). Tek oynatıcı
 * başa sarmayı yetiştiremez; birkaç oynatıcı sırayla kullanılır.
 */
const TICK_VOICES = 4;
/** İki tık arasında en az bu kadar süre (ms): çark en hızlıyken sesler üst üste yığılmasın. */
const TICK_GAP_MS = 45;
const tickPlayers: AudioPlayer[] = [];
let tickNext = 0;
let tickAt = 0;
let configured = false;

/** Ses oturumunu bir kez kurar (efektler ve fon sesi aynı ayarı kullanır). */
export function configureAudio(): void {
  configure();
}

function configure(): void {
  if (configured) return;
  configured = true;
  // Sessiz moddaysa çalma; başka uygulamanın müziğini (Spotify vb.) kesme.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

function playerFor(name: SoundName): AudioPlayer {
  let player = players.get(name);
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    players.set(name, player);
  }
  return player;
}

export const audio = {
  /** Şans çarkı: ibre bir dilimi geçti. Çok sık çağrılabilir; fazlası atlanır. */
  tick(): void {
    if (!useSettings.getState().sfx) return;
    const now = Date.now();
    if (now - tickAt < TICK_GAP_MS) return;
    tickAt = now;
    try {
      configure();
      let player = tickPlayers[tickNext];
      if (!player) {
        player = createAudioPlayer(SOURCES.tick);
        tickPlayers[tickNext] = player;
      }
      tickNext = (tickNext + 1) % TICK_VOICES;
      const voice = player;
      const start = () => voice.play();
      voice.seekTo(0).then(start, start);
    } catch {
      // Ses asla oyunu bozmamalı.
    }
  },

  /** Sesleri önceden yükler ki ilk dokunuşta gecikme olmasın. */
  preload(): void {
    try {
      configure();
      (Object.keys(SOURCES) as SoundName[]).forEach(playerFor);
    } catch {
      // Ses asla oyunu bozmamalı.
    }
  },

  play(name: SoundName): void {
    if (!useSettings.getState().sfx) return;
    try {
      configure();
      const player = playerFor(name);
      // Baştan çal. Başa sarma eşzamansızdır: bitmesini beklemeden `play()`
      // çağrılırsa oynatıcı hâlâ sesin sonundadır ve anında durur (ses yalnızca
      // ilk seferinde duyulur). Bu yüzden önce sar, sonra çal.
      const start = () => player.play();
      player.seekTo(0).then(start, start);
    } catch {
      // Ses asla oyunu bozmamalı.
    }
  },
};
