import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, Tone } from '../theme';

interface Props {
  icon: LucideIcon;
  /**
   * @deprecated Ignored: every icon is the app's teal (the owner's choice,
   * 2026-10-08). Status colours stay on badges, which are labels.
   */
  tone?: Tone;
  size?: number;
}

export function IconCircle({ icon: Icon, size = 40 }: Props) {
  const fg = colors.primary;
  const bg = colors.primarySoft;
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2.8, backgroundColor: bg }]}>
      <Icon size={size * 0.5} color={fg} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
