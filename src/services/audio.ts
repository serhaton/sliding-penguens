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
} as const;

export type SoundName = keyof typeof SOURCES;

/** Dosyaların hepsi aynı tepe düzeyinde; denge burada kurulur. */
const VOLUME: Partial<Record<SoundName, number>> = {
  tap: 0.5,
  slide: 0.9,
  bump: 0.9,
  star: 0.6,
  crack: 0.8,
};

const players = new Map<SoundName, AudioPlayer>();
let configured = false;

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
    player.volume = VOLUME[name] ?? 1;
    players.set(name, player);
  }
  return player;
}

export const audio = {
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
