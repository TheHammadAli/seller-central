import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, Tone } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconCircle } from './IconCircle';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
  onPress?: () => void;
  /** Three to a row instead of two. */
  compact?: boolean;
}

/** A number with its label, half a row wide (a third when compact). */
export function StatCard({ icon, label, value, tone = 'primary', hint, onPress, compact }: Props) {
  return (
    <Card onPress={onPress} style={[styles.card, compact && styles.compact]}>
      <IconCircle icon={icon} tone={tone} size={36} />
      <View style={styles.text}>
        <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="small" color={colors.primary} numberOfLines={1}>
            {hint}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '47%', flexGrow: 1, padding: spacing.md, gap: spacing.sm },
  compact: { flexBasis: 0 },
  text: { gap: 2 },
});
