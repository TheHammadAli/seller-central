import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconCircle } from './IconCircle';
import { t } from '../i18n';

interface Props {
  icon: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <IconCircle icon={icon} size={64} tone="primary" />
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color={colors.textMuted} align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

/** First load, or a load that failed with a way to try again. */
export function StateView({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  if (error) {
    return (
      <View style={styles.wrap}>
        <AppText variant="subheading" align="center">
          {t("Couldn't load this")}
        </AppText>
        <AppText color={colors.textMuted} align="center">
          {error}
        </AppText>
        {onRetry ? <Button title={t('Try again')} variant="outline" onPress={onRetry} style={styles.action} /> : null}
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
    minHeight: 280,
  },
  action: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
