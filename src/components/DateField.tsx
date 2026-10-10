import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, themedStyles } from '../theme';
import { formatDate } from '../utils/format';
import { AppText } from './AppText';
import { Button } from './Button';
import { t } from '../i18n';

interface Props {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minimumDate?: Date;
  /** Offers an × to clear the date (for optional dates). */
  clearable?: boolean;
  error?: string;
  style?: object;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = t('Pick a date'),
  minimumDate,
  clearable,
  error,
  style,
}: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? minimumDate ?? new Date(),
        mode: 'date',
        minimumDate,
        onValueChange: (_e, date) => onChange(date),
      });
    } else {
      setDraft(value ?? minimumDate ?? new Date());
      setIosOpen(true);
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <Pressable onPress={open} style={[styles.box, !!error && styles.errored]}>
        <CalendarDays size={18} color={colors.primary} />
        <AppText style={styles.flex} color={value ? colors.text : colors.textSubtle}>
          {value ? formatDate(value) : placeholder}
        </AppText>
        {clearable && value ? (
          <Pressable onPress={() => onChange(undefined)} hitSlop={10} accessibilityLabel={t('Clear date')}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                minimumDate={minimumDate}
                accentColor={colors.primary}
                onValueChange={(_e, date) => setDraft(date)}
              />
              <View style={styles.sheetButtons}>
                <Button title={t('Cancel')} variant="ghost" flex onPress={() => setIosOpen(false)} />
                <Button
                  title={t('Done')}
                  flex
                  onPress={() => {
                    onChange(draft);
                    setIosOpen(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm },
  box: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  errored: { borderColor: colors.danger },
  error: { marginTop: spacing.xs },
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
}));
