import { Alert } from 'react-native';
import { Language, language, setLanguage, t } from '../i18n';

/** Each language in its own words, as the language choice shows them. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', ur: 'اردو' };

/** Switches to `next` after asking: the app restarts to change its language. */
export function chooseLanguage(next: Language) {
  if (next === language) return;
  Alert.alert(
    t('Change the language?'),
    t('Seller Central restarts in {language}. You stay logged in.', { language: LANGUAGE_NAMES[next] }),
    [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Restart'), onPress: () => setLanguage(next) },
    ],
  );
}
