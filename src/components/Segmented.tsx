import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, spacing, themedStyles } from '../theme';
import { AppText } from './AppText';

interface Props<K extends string> {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}

/** Two to four equal choices side by side. */
export function Segmented<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View style={styles.track}>
      {options.map(o => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.option, active && styles.active]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <AppText variant="label" color={active ? colors.primary : colors.textMuted}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  active: { backgroundColor: colors.surface, ...shadow },
}));
