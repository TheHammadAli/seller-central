import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { formatCompact } from '../utils/format';
import { AppText } from './AppText';

interface Props {
  data: { label: string; value: number }[];
  height?: number;
}

/** Simple vertical bars, the last one highlighted (the current day/week/month). */
export function BarChart({ data, height = 150 }: Props) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <View style={styles.wrap}>
      {data.map((d, i) => {
        const last = i === data.length - 1;
        const h = Math.max(4, (d.value / max) * height);
        return (
          <View key={`${d.label}-${i}`} style={styles.col}>
            <AppText variant="small" color={last ? colors.primary : colors.textMuted} numberOfLines={1}>
              {d.value ? formatCompact(d.value) : ''}
            </AppText>
            <View style={[styles.slot, { height }]}>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: last ? colors.primary : colors.primaryTint },
                ]}
              />
            </View>
            <AppText variant="small" color={colors.textMuted} numberOfLines={1}>
              {d.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  slot: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderRadius: radius.sm },
});
