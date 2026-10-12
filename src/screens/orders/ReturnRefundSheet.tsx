import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateOrderStatus } from '../../api';
import { AppText, Button, TextField, Thumb } from '../../components';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { Order } from '../../types/models';
import { formatRs } from '../../utils/format';
import { t } from '../../i18n';

/** The reasons a seller picks most; any other is typed in. */
const QUICK_REASONS = [
  t('Wrong size'),
  t('Damaged'),
  t('Not as described'),
  t('Changed their mind'),
];

/** As on Fazl (src/orders/model/order.model.ts in the backend). */
const MAX_REASON_LENGTH = 500;

/**
 * Records a return or a refund on a real order. "return": a delivered order
 * the customer sent back, with why. "refund": what the seller paid the
 * customer back for a returned one — the whole order, or part of it. Orders
 * are cash on delivery, so the seller pays it back themselves; this records
 * it, takes it off their earnings and tells the customer on Fazl.
 */
export function ReturnRefundSheet({
  mode,
  order,
  shopId,
  onClose,
  onDone,
}: {
  mode: 'return' | 'refund' | null;
  order: Order;
  shopId: string;
  onClose: () => void;
  onDone: (order: Order) => void;
}) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const total = order.subtotal;

  useEffect(() => {
    if (!mode) return;
    setReason('');
    setAmount(String(total));
    setError(null);
    setSaving(false);
  }, [mode, total]);

  if (!mode) return null;
  const item = order.items[0];
  const value = Number(amount);

  const save = async () => {
    // Fazl's own rules, checked here first so the message comes at once.
    if (mode === 'return' && !reason.trim()) {
      setError(t('Say why the customer sent it back.'));
      return;
    }
    if (mode === 'refund' && (!Number.isInteger(value) || value < 1 || value > total)) {
      setError(t('Enter a whole amount from 1 up to {amount}.', { amount: formatRs(total) }));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      onDone(
        mode === 'return'
          ? await updateOrderStatus(shopId, order.id, 'returned', { reason: reason.trim() })
          : await updateOrderStatus(shopId, order.id, 'refunded', { refundAmount: value }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not update the order'));
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel={t('Close')} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <AppText variant="subheading">
            {mode === 'return' ? t('Mark as returned') : t('Refund the customer')}
          </AppText>
          <View style={styles.product}>
            <Thumb uri={item?.image} size={52} />
            <View style={styles.flex}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {item?.title}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {order.number} · {formatRs(total)}
              </AppText>
            </View>
          </View>

          {mode === 'return' ? (
            <>
              <View style={styles.chips}>
                {QUICK_REASONS.map(quick => {
                  const active = reason.trim() === quick;
                  return (
                    <Pressable
                      key={quick}
                      onPress={() => {
                        setReason(quick);
                        setError(null);
                      }}
                      style={[styles.chip, active && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <AppText variant="caption" color={active ? colors.white : colors.text}>
                        {quick}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <TextField
                label={t('Reason')}
                value={reason}
                onChangeText={text => {
                  setReason(text);
                  setError(null);
                }}
                placeholder={t('Why did the customer send it back?')}
                maxLength={MAX_REASON_LENGTH}
                multiline
              />
              <AppText variant="caption" color={colors.textMuted}>
                {t('Use this once the product is back with you. The customer is told on Fazl, and you can refund them next.')}
              </AppText>
            </>
          ) : (
            <>
              {order.returnReason ? (
                <AppText variant="caption" color={colors.textMuted}>
                  {t('Reason: {reason}', { reason: order.returnReason })}
                </AppText>
              ) : null}
              <TextField
                label={t('Amount refunded')}
                prefix={t('Rs')}
                value={amount}
                onChangeText={text => {
                  setAmount(text.replace(/\D/g, ''));
                  setError(null);
                }}
                keyboardType="number-pad"
                hint={
                  value === total
                    ? t('The whole order')
                    : t('Up to {amount}, the whole order', { amount: formatRs(total) })
                }
              />
              <AppText variant="caption" color={colors.textMuted}>
                {t('Pay the customer back yourself, then record it here. It comes off your earnings, and the customer is told on Fazl.')}
              </AppText>
            </>
          )}

          {error ? (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {error}
            </AppText>
          ) : null}

          <View style={styles.buttons}>
            <Button title={t('Cancel')} variant="outline" flex disabled={saving} onPress={onClose} />
            <Button
              title={
                mode === 'return'
                  ? t('Mark returned')
                  : t('Refund {amount}', { amount: formatRs(value > 0 ? value : 0) })
              }
              flex
              loading={saving}
              loadingText={t('Saving')}
              disabled={saving}
              onPress={save}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  product: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { marginTop: spacing.xs },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
}));
