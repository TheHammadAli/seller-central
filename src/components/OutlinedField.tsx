import { Eye, EyeOff } from 'lucide-react-native';
import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, colorScheme, fonts, themedStyles } from '../theme';
import { AppText } from './AppText';
import { t } from '../i18n';

// The Fazl app's outlined field (Native-fazl-app FormField / PasswordField
// with `outlined`): a rounded box with its label sitting on the top border.
const FAZL = {
  get border() {
    return colorScheme() === 'dark' ? colors.border : '#E0E0E0';
  },
  get label() {
    return colorScheme() === 'dark' ? colors.textMuted : '#4B514F';
  },
  get placeholder() {
    return colorScheme() === 'dark' ? colors.textSubtle : '#9E9E9E';
  },
  get error() {
    return colorScheme() === 'dark' ? colors.danger : '#F44336';
  },
  get eye() {
    return colorScheme() === 'dark' ? colors.textMuted : '#757575';
  },
};

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  /** A password: hidden, with an eye to show it. */
  password?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const OutlinedField = forwardRef<TextInputInstance, Props>(function OutlinedFieldInner(
  { label, error, password, style, onFocus, onBlur, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const labelColor = error ? FAZL.error : focused ? colors.primary : FAZL.label;

  return (
    <View style={[styles.container, style]}>
      <AppText style={[styles.label, { color: labelColor }]}>{label}</AppText>
      <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}>
        <TextInput
          ref={ref}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={FAZL.placeholder}
          {...input}
          secureTextEntry={password ? !shown : input.secureTextEntry}
          style={[styles.input, password && styles.inputWithEye]}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable
            onPress={() => setShown(s => !s)}
            style={styles.eye}
            hitSlop={8}
            accessibilityLabel={shown ? t('Hide password') : t('Show password')}
          >
            {shown ? <EyeOff size={20} color={FAZL.eye} /> : <Eye size={20} color={FAZL.eye} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
    </View>
  );
});

const styles = themedStyles(() => StyleSheet.create({
  container: { position: 'relative', marginBottom: 20 },
  // A white background cuts the border line under the label.
  label: {
    position: 'absolute',
    top: -9,
    left: 12,
    zIndex: 1,
    paddingHorizontal: 6,
    // The page behind it, so the label's notch blends in (light or dark).
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FAZL.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
  },
  boxFocused: { borderColor: colors.primary },
  boxError: { borderColor: FAZL.error },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  inputWithEye: { paddingRight: 8 },
  eye: { paddingHorizontal: 8, paddingVertical: 4 },
  error: { marginTop: 4, fontFamily: fonts.regular, fontSize: 12, color: FAZL.error },
}));
