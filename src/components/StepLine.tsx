import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, themedStyles } from '../theme';
import { AppText } from './AppText';

export interface Step {
  label: string;
  done: boolean;
  current?: boolean;
  /** When it happened, already formatted. */
  at?: string;
}

/** A vertical progress line: done steps ticked, the current one ringed. */
export function StepLine({ steps }: { steps: Step[] }) {
  return (
    <View>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <View key={s.label} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  s.done && styles.dotDone,
                  s.current && styles.dotCurrent,
                ]}
              >
                {s.done ? <Check size={12} color={colors.white} strokeWidth={3} /> : null}
              </View>
              {!last ? <View style={[styles.line, s.done && styles.lineDone]} /> : null}
            </View>
            <View style={[styles.text, !last && styles.textGap]}>
              <AppText
                variant={s.current ? 'bodyBold' : 'body'}
                color={s.done || s.current ? colors.text : colors.textSubtle}
              >
                {s.label}
              </AppText>
              {s.at ? (
                <AppText variant="caption" color={colors.textMuted}>
                  {s.at}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 22 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotCurrent: { borderColor: colors.primary, borderWidth: 3 },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.primary },
  text: { flex: 1, paddingTop: 1 },
  textGap: { paddingBottom: spacing.lg },
}));
