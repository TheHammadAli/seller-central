import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, spacing, Tone, toneColors } from '../theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  tone?: Tone;
  /** Solid fill instead of the soft tint. */
  solid?: boolean;
}

export function Badge({ label, tone = 'neutral', solid }: Props) {
  const { fg, bg } = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: solid ? fg : bg }]}>
      <AppText variant="small" color={solid ? '#FFFFFF' : fg} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
});
