import { LucideIcon } from 'lucide-react-native';
import { ChevronForward } from './Chevrons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, themedStyles, Tone } from '../theme';
import { AppText } from './AppText';
import { IconCircle } from './IconCircle';

interface Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: Tone;
  right?: React.ReactNode;
  onPress?: () => void;
  /** Draws a line under the row (rows stacked in one card). */
  divider?: boolean;
}

export function ListRow({ title, subtitle, icon, tone, right, onPress, divider }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      {icon ? <IconCircle icon={icon} tone={tone} size={38} /> : null}
      <View style={styles.text}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <ChevronForward size={20} color={colors.textSubtle} /> : null}
    </Pressable>
  );
}

/** "Label ........ value" line, for summaries. */
export function InfoRow({
  label,
  value,
  strong,
  color,
}: {
  label: string;
  value: string;
  strong?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.info}>
      <AppText variant={strong ? 'bodyBold' : 'body'} color={strong ? colors.text : colors.textMuted}>
        {label}
      </AppText>
      <AppText variant={strong ? 'subheading' : 'bodyBold'} color={color ?? colors.text}>
        {value}
      </AppText>
    </View>
  );
}

export function Divider() {
  return <View style={styles.line} />;
}

const styles = themedStyles(() => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
}));
