import { useNavigation } from '@react-navigation/native';
import { ChevronBack } from './Chevrons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, themedStyles } from '../theme';
import { AppText } from './AppText';
import { t } from '../i18n';

interface Props {
  title: string;
  subtitle?: string;
  /** Shows a back arrow; on by default when there is somewhere to go back to. */
  back?: boolean;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, back, right }: Props) {
  const navigation = useNavigation();
  const showBack = back ?? navigation.canGoBack();

  return (
    <View style={styles.bar}>
      {showBack ? (
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t('Back')}
        >
          <ChevronBack size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  bar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  back: { marginLeft: -6 },
  titles: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
