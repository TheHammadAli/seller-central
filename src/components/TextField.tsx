import React, { forwardRef, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts, radius, spacing, themedStyles } from '../theme';
import { AppText } from './AppText';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  /** Shown inside the box before the text, e.g. "Rs". */
  prefix?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInputInstance, Props>(function TextFieldInner(
  { label, hint, error, prefix, right, style, multiline, onFocus, onBlur, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {prefix ? (
          <AppText variant="bodyBold" color={colors.textMuted}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          {...input}
          multiline={multiline}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, multiline && styles.inputMultiline]}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {right}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.below}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={colors.textMuted} style={styles.below}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = themedStyles(() => StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm },
  box: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  focused: { borderColor: colors.primary },
  errored: { borderColor: colors.danger },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  below: { marginTop: spacing.xs },
}));
