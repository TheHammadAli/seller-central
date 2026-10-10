import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setProductSale } from '../../api/shopContent';
import { AppText, Button, DateField, TextField, Thumb } from '../../components';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { Product } from '../../types/models';
import { formatRs } from '../../utils/format';
import { t } from '../../i18n';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/**
 * Puts one product on sale, changes its sale, or ends it: a sale price below
 * the regular one and optional dates. Dates are whole days — the sale starts
 * as its start day begins and ends as its end day ends — and Fazl switches
 * the price by itself on them. No start date: at once. No end date: until
 * the sale is ended here.
 */
export function SaleSheet({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [price, setPrice] = useState('');
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'save' | 'end' | null>(null);

  useEffect(() => {
    if (!product) return;
    setPrice(product.salePrice != null ? String(product.salePrice) : '');
    setStart(product.saleStart ? new Date(product.saleStart) : undefined);
    setEnd(product.saleEnd ? new Date(product.saleEnd) : undefined);
    setError(null);
    setSaving(null);
  }, [product]);

  if (!product) return null;
  const regular = product.price;
  const value = Number(price);
  const off = value > 0 && value < regular ? Math.round((1 - value / regular) * 100) : null;
  const hasSale = product.salePrice != null;

  const save = async () => {
    // The backend's own rules, checked here first so the message comes at once.
    if (!price.trim() || !Number.isInteger(value) || value < 1) {
      setError(t('Enter the sale price as a whole number of at least 1.'));
      return;
    }
    if (value >= regular) {
      setError(t('The sale price must be lower than the regular price.'));
      return;
    }
    if (start && end && end < start) {
      setError(t('The sale must end after it starts.'));
      return;
    }
    setError(null);
    setSaving('save');
    try {
      await setProductSale(product.id, {
        salePrice: value,
        saleStartsAt: start ? startOfDay(start).toISOString() : null,
        saleEndsAt: end ? endOfDay(end).toISOString() : null,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Couldn't save the sale"));
      setSaving(null);
    }
  };

  const endSale = () =>
    Alert.alert(t('End this sale?'), t('Fazl shows the regular price again right away.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('End sale'),
        style: 'destructive',
        onPress: async () => {
          setSaving('end');
          try {
            await setProductSale(product.id, { salePrice: null });
            onSaved();
          } catch (e) {
            setError(e instanceof Error ? e.message : t("Couldn't end the sale"));
            setSaving(null);
          }
        },
      },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel={t('Close')} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.product}>
            <Thumb uri={product.images[0]} size={52} />
            <View style={styles.flex}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {product.title}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Regular price {formatRs(regular)}
              </AppText>
            </View>
          </View>

          <TextField
            label={t('Sale price')}
            prefix={t('Rs')}
            value={price}
            onChangeText={text => {
              setPrice(text.replace(/\D/g, ''));
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder={t('Below {price}', { price: regular })}
            hint={off !== null ? t('{percent}% off', { percent: off }) : undefined}
          />
          <View style={styles.dates}>
            <View style={styles.flex}>
              <DateField
                label={t('Starts')}
                value={start}
                onChange={d => {
                  setStart(d);
                  setError(null);
                }}
                placeholder={t('Now')}
                minimumDate={new Date()}
                clearable
              />
            </View>
            <View style={styles.flex}>
              <DateField
                label={t('Ends')}
                value={end}
                onChange={d => {
                  setEnd(d);
                  setError(null);
                }}
                placeholder={t('No end date')}
                minimumDate={start ?? new Date()}
                clearable
              />
            </View>
          </View>
          <AppText variant="caption" color={colors.textMuted}>
            {t('The sale starts and ends by itself on these days. After it ends, Fazl shows the regular price again.')}
          </AppText>

          {error ? (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {error}
            </AppText>
          ) : null}

          <View style={styles.buttons}>
            {hasSale ? (
              <Button
                title={t('End sale')}
                variant="outline"
                flex
                loading={saving === 'end'}
                disabled={saving !== null}
                onPress={endSale}
              />
            ) : null}
            <Button
              title={hasSale ? t('Save changes') : t('Start sale')}
              flex
              loading={saving === 'save'}
              loadingText={t('Saving')}
              disabled={saving !== null}
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
  product: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  dates: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  error: { marginTop: spacing.xs },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
}));
