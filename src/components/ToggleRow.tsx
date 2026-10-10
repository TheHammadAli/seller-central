import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { colors, spacing, themedStyles } from '../theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  divider?: boolean;
}

export function ToggleRow({ label, description, value, onChange, divider }: Props) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.text}>
        <AppText variant="bodyBold">{label}</AppText>
        {description ? (
          <AppText variant="caption" color={colors.textMuted}>
            {description}
          </AppText>
        ) : null}
      </View>
      <AppSwitch value={value} onChange={onChange} />
    </View>
  );
}

export function AppSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.border, true: colors.primaryTint }}
      thumbColor={value ? colors.primary : '#FAFAFA'}
      ios_backgroundColor={colors.border}
    />
  );
}

const styles = themedStyles(() => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  text: { flex: 1, gap: 2 },
}));
