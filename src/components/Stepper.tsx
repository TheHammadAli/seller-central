import { Minus, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius, themedStyles } from '../theme';
import { t } from '../i18n';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}

/** − [12] + — for stock counts; the number can also be typed. */
export function Stepper({ value, onChange, min = 0 }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ''), 10);
    const next = Number.isFinite(n) ? Math.max(min, n) : value;
    setText(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => value > min && onChange(value - 1)}
        style={styles.btn}
        hitSlop={6}
        accessibilityLabel={t('Decrease')}
      >
        <Minus size={16} color={colors.primary} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={e => commit(e.nativeEvent.text)}
        keyboardType="number-pad"
        style={styles.input}
        selectTextOnFocus
      />
      <Pressable
        onPress={() => onChange(value + 1)}
        style={styles.btn}
        hitSlop={6}
        accessibilityLabel={t('Increase')}
      >
        <Plus size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minWidth: 44,
    height: 32,
    paddingVertical: 0,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
}));
