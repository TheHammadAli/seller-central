import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, themedStyles } from '../theme';
import { AppText } from './AppText';

export interface ChipItem<K extends string> {
  key: K;
  label: string;
  count?: number;
}

interface Props<K extends string> {
  items: ChipItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Inside an already padded list: reach the screen edges while scrolling. */
  bleed?: boolean;
}

/** A sideways-scrolling row of filters, one selected. */
export function FilterChips<K extends string>({ items, value, onChange, bleed }: Props<K>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={[styles.scroll, bleed && styles.bleed]}
    >
      {items.map(item => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.chip, active && styles.active]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <AppText variant="label" color={active ? colors.white : colors.text}>
              {item.label}
            </AppText>
            {item.count != null ? (
              <View style={[styles.count, active && styles.countActive]}>
                <AppText variant="small" color={active ? colors.primary : colors.textMuted}>
                  {item.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  scroll: { flexGrow: 0 },
  bleed: { marginHorizontal: -spacing.lg },
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md + 2,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  count: {
    minWidth: 20,
    paddingHorizontal: 5,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countActive: { backgroundColor: colors.white },
}));
