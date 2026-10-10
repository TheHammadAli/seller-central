import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';
import ur from './ur';

export type Language = 'en' | 'ur';

/**
 * The app's language for this run. Urdu lays the app out right to left, and
 * React Native only switches direction on a restart (see setLanguage), so the
 * direction the app started in is the language: fixed until the next start.
 * A phone set to Urdu starts in Urdu.
 */
export const language: Language = I18nManager.isRTL ? 'ur' : 'en';
export const isUrdu = language === 'ur';

/**
 * `text` in the app's language. The English text is its own key (ur.ts maps it
 * to Urdu); one with no translation yet shows in English. `{name}` places are
 * filled from `params`: t('{count} products', { count: 3 }).
 */
export function t(text: string, params?: Record<string, string | number>): string {
  const translated = isUrdu ? ur[text] ?? text : text;
  if (!params) return translated;
  return translated.replace(/\{(\w+)\}/g, (place, key: string) => (key in params ? String(params[key]) : place));
}

/**
 * Switches the app to `next` (Settings > Language, or the login screen): Urdu
 * right to left, English left to right. The app restarts to lay itself out
 * again; the session is kept.
 */
export function setLanguage(next: Language) {
  if (next === language) return;
  I18nManager.allowRTL(next === 'ur');
  I18nManager.forceRTL(next === 'ur');
  // A moment for the setting to be saved before the restart.
  setTimeout(() => RNRestart.restart(), 150);
}
