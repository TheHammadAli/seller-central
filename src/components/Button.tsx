import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';
import { LoadingText } from './LoadingText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  /** While loading, this text with animated dots ("Creating...") instead of a spinner. */
  loadingText?: string;
  disabled?: boolean;
  size?: 'md' | 'sm';
  /** Grows to fill a row (e.g. two buttons side by side in a footer). */
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Each variant's colours, from the current palette (light or dark). */
const lookOf = (variant: ButtonVariant): { bg: string; fg: string; border: string } =>
  ({
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
    outline: { bg: colors.surface, fg: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
  })[variant];

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading,
  loadingText,
  disabled,
  size = 'md',
  flex,
  style,
}: Props) {
  const look = lookOf(variant);
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: look.bg, borderColor: look.border },
        flex && styles.flex,
        // A button busy with its own work stays in full colour.
        inactive && !(loading && loadingText) && styles.inactive,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading && loadingText ? (
        <LoadingText text={loadingText} color={look.fg} variant={size === 'sm' ? 'label' : 'bodyBold'} />
      ) : loading ? (
        <ActivityIndicator color={look.fg} size="small" />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={size === 'sm' ? 16 : 18} color={look.fg} /> : null}
          <AppText variant={size === 'sm' ? 'label' : 'bodyBold'} color={look.fg}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  md: { minHeight: 48 },
  sm: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  flex: { flex: 1 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
