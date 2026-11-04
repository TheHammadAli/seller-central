import React, { useRef, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, TextInput, TextInputInstance, View } from 'react-native';
import { colors, fonts, line, themedStyles } from '../theme';
import { AppText } from './AppText';

/**
 * A one-time code typed into a row of boxes, a digit in each. One field over
 * the boxes, unseen, takes the typing — and the code the phone offers from the
 * SMS or email — and the boxes show it. Always left to right, Urdu included:
 * a code is read in the order it was sent. `onComplete` once every box is full.
 */
export function CodeBoxes({
  value,
  onChange,
  onComplete,
  length = 6,
  label,
  autoFocus,
  editable = true,
  error = false,
}: {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  label: string;
  autoFocus?: boolean;
  editable?: boolean;
  error?: boolean;
}) {
  const input = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split('');

  // iOS never hands a tap to a view it can't see (the field is at opacity 0),
  // so a tap on the boxes reaches them instead and they bring the keyboard
  // back. Still focused with the keyboard put away (Android's back button):
  // blur first, or focusing would do nothing.
  const focus = () => {
    if (!editable) return;
    if (input.current?.isFocused()) input.current.blur();
    input.current?.focus();
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={focus}
        accessible={false}
        style={[styles.row, I18nManager.isRTL && styles.leftToRight]}
      >
        {Array.from({ length }, (_, i) => {
          // The box the next digit goes in (the last one once all are in).
          const current = focused && i === Math.min(digits.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                digits[i] ? styles.filled : null,
                current ? styles.current : null,
                error ? styles.error : null,
              ]}
            >
              <AppText style={styles.digit} allowFontScaling={false}>
                {digits[i] ?? ''}
              </AppText>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={value}
        onChangeText={text => {
          const code = text.replace(/\D/g, '').slice(0, length);
          onChange(code);
          if (code.length === length) onComplete?.(code);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        editable={editable}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        style={styles.input}
      />
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { marginBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
    // Under right-to-left, a row runs right to left; a code doesn't.
    leftToRight: { flexDirection: 'row-reverse' },
    box: {
      flex: 1,
      maxWidth: 52,
      height: 58,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filled: { borderColor: colors.primary, backgroundColor: colors.surface },
    current: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
    error: { borderColor: colors.danger },
    // Its own line height: AppText's body one (20) is shorter than the digit,
    // and iOS cut the top off it.
    digit: { fontFamily: fonts.bold, fontSize: 22, lineHeight: line(30), color: colors.text },
    // Over the boxes, so a tap anywhere on them brings up the keyboard
    // (on Android; on iOS the boxes take the tap, see `focus`).
    input: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
  }),
);
