import { Alert } from 'react-native';
import { t } from '../i18n';

/** Asks before logging out: every "Log out" in the app goes through here. */
export function confirmLogout(signOut: () => unknown) {
  Alert.alert(t('Log out?'), t("You'll need to log in again to manage your shop."), [
    { text: t('Cancel'), style: 'cancel' },
    {
      text: t('Log out'),
      style: 'destructive',
      onPress: () => {
        signOut();
      },
    },
  ]);
}
