/**
 * English strings. Must contain exactly the same keys as `tr.ts`;
 * the `Translations` type turns a missing or extra key into a compile error.
 */
import type { Translations } from './tr';

export const en: Translations = {
  // App
  'app.name': 'Sliding Penguins',

  // Home
  'home.play': 'Play',
  'home.level': 'Level {n}',
  'home.duel': 'Duel',
  'home.daily': 'Daily puzzle',
  'home.shop': 'Shop',
  'home.profile': 'My penguin',
  'home.settings': 'Settings',
  'home.map': 'Map',
  'home.coins': 'Coins',

  // World map
  'map.title': 'Map',
  'map.antarctica': 'Antarctica',
  'map.episode': 'Episode {n}',
  'map.episode1': 'Ice Shore',
  'map.episode2': 'Cracked Ice',
  'map.episode3': 'Sleepy Penguin',
  'map.sectionA': 'Calm Shore',
  'map.sectionB': 'Spin Glacier',
  'map.sectionC': 'Wave Bay',
  'map.locked': 'Locked',
  'map.overview': 'Whole continent',
  'map.focus': 'Back to my level',
  'map.stars': '{n} / {max} stars',

  // Settings
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.theme': 'Theme',
  'settings.auto': 'Auto',
  'settings.day': 'Day',
  'settings.night': 'Night',
  'settings.music': 'Music',
  'settings.sfx': 'Sound effects',
  'settings.haptics': 'Vibration',
  'settings.largeSymbols': 'Large symbols',
  'settings.largeSymbolsHint': 'Makes colors easier to tell apart',

  // Level screen
  'level.title': 'Level {n}',
  'level.moves': 'Moves',
  'level.undo': 'Undo',
  'level.hint': 'Hint',
  'level.restart': 'Restart',
  'level.stuck': 'Stuck! Undo or restart.',
  'level.complete': 'Awesome!',
  'level.completeMoves': '{n} moves',
  'level.next': 'Next',
  'level.replay': 'Play again',
  'level.home': 'Home',
  'level.notFound': 'Level not found',
  'level.double': 'Double',
  'level.doubleHint': 'Watch a video to double your coins',
  'level.share': 'Share',

  // Hint and undo offer (coins or video)
  'offer.hint': 'Hint',
  'offer.hintBody': 'Show the next move',
  'offer.undo': 'Undo',
  'offer.undoBody': '{n} more undos',
  'offer.video': 'Watch video',
  'offer.noCoins': 'Not enough coins',

  // Mechanic intros (when a new rule first appears)
  'intro.turn': 'Bump and turn!',
  'intro.waves': 'More penguins incoming!',
  'intro.gotIt': 'Got it',

  // Screens that are not built yet
  'soon.title': 'Coming soon',
  'soon.body': 'The penguins are getting this ready.',

  // iCloud backup
  'icloud.title': 'iCloud backup',
  'icloud.on': 'On',
  'icloud.off': 'Off',
  'icloud.pending': 'Sending…',
  'icloud.offHint': 'Turn on iCloud to back up your coins.',

  // Developer screens (only visible in development builds)
  'dev.title': 'Developer',
  'dev.characters': 'Character scene',
  'dev.levels': 'Level viewer',
  'dev.waves': 'waves',
  'dev.sectionA': 'A · Fixed direction (1–10)',
  'dev.sectionB': 'B · Turn on bump (11–20)',
  'dev.sectionC': 'C · Waves (21–30)',
  'dev.resetIntros': 'Reset intros',
  'dev.wallet': 'Wallet diagnostics',
  'dev.preview': 'Preview',
  'dev.cast': 'Characters',
  'dev.moods': 'Expressions',
  'dev.poses': 'Poses and directions',
  'dev.board': 'Board pieces',
  'dev.costume': 'Costume',
  'dev.largeSymbols': 'Large symbols',

  // Personalities
  'personality.curious': 'curious',
  'personality.hasty': 'hasty',
  'personality.shy': 'shy',
  'personality.cheerful': 'cheerful',
  'personality.sleepy': 'sleepy',
  'personality.proud': 'proud',

  // Common
  'common.back': 'Back',
  'common.close': 'Close',
};
