import { Store } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, IconCircle, Screen } from '../../components';
import { RootScreenProps } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing } from '../../theme';
import { confirmLogout } from '../../utils/confirmLogout';
import { t } from '../../i18n';

/** Logged in, but the account has no shop yet: create one here, on Fazl. */
export function NoShopScreen({ navigation }: RootScreenProps<'NoShop'>) {
  const { seller, signOut } = useAuth();
  return (
    <Screen background={colors.surface} scroll={false} contentStyle={styles.content}>
      <View style={styles.middle}>
        {/* Teal, as on the login screen. */}
        <IconCircle icon={Store} size={88} />
        <AppText variant="title" align="center">
          {t('Create your shop')}
        </AppText>
        <AppText color={colors.textMuted} align="center">
          {seller?.email} doesn't have a shop on Fazl yet. Create it here: it goes on Fazl too, and you
          can start listing your products in it right away.
        </AppText>
      </View>
      <Button title={t('Create your shop')} onPress={() => navigation.navigate('CreateShop')} />
      <Button title={t('Log out')} variant="ghost" onPress={() => confirmLogout(signOut)} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logout: { marginTop: spacing.sm },
});
