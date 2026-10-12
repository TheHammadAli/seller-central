import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { getOrder, setTracking } from '../../api';
import { AppText, Button, Header, Screen, TextField } from '../../components';
import { RootScreenProps } from '../../navigation/types';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { COURIERS } from '../../utils/orders';
import { t } from '../../i18n';
import { useAuth } from '../../state/AuthContext';

/** Courier company + tracking ID for a nationwide order. */
export function CourierFormScreen({ route, navigation }: RootScreenProps<'CourierForm'>) {
  const { orderId } = route.params;
  const [courier, setCourier] = useState('');
  const [otherCourier, setOtherCourier] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [errors, setErrors] = useState<{ courier?: string; tracking?: string }>({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const shopId = useAuth().seller?.shop?.id;

  useEffect(() => {
    if (!shopId) return;
    getOrder(shopId, orderId).then(o => {
      if (o.delivery.courier) {
        setEditing(true);
        const known = COURIERS.includes(o.delivery.courier);
        setCourier(known ? o.delivery.courier : 'Other');
        if (!known) setOtherCourier(o.delivery.courier);
        setTrackingId(o.delivery.trackingId ?? '');
      }
    }, () => undefined);
  }, [shopId, orderId]);

  const save = async () => {
    const name = courier === 'Other' ? otherCourier.trim() : courier;
    const next: typeof errors = {};
    if (!name) next.courier = t('Choose the courier company');
    if (!trackingId.trim()) next.tracking = t('Enter the tracking ID from the courier receipt');
    setErrors(next);
    if (next.courier || next.tracking) return;
    if (!shopId) return;
    setSaving(true);
    try {
      await setTracking(shopId, orderId, name, trackingId.trim(), editing);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('Could not save tracking'), e instanceof Error ? e.message : '');
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<Header title={editing ? t('Edit tracking') : t('Ship with a courier')} />}
      footer={<Button title={editing ? t('Save tracking') : t('Mark as shipped')} flex loading={saving} onPress={save} />}
    >
      <AppText color={colors.textMuted} style={styles.intro}>
        {t('Book the parcel with your courier, then enter its tracking ID here. The customer can follow it on Fazl.')}
      </AppText>

      <AppText variant="label" style={styles.label}>
        {t('Courier company')}
      </AppText>
      <View style={styles.grid}>
        {COURIERS.map(c => {
          const active = c === courier;
          return (
            <Pressable
              key={c}
              onPress={() => {
                setCourier(c);
                setErrors(e => ({ ...e, courier: undefined }));
              }}
              style={[styles.option, active && styles.optionActive]}
            >
              <AppText variant="label" color={active ? colors.white : colors.text}>
                {t(c)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {errors.courier ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {errors.courier}
        </AppText>
      ) : null}

      {courier === 'Other' ? (
        <TextField
          label={t('Courier name')}
          value={otherCourier}
          onChangeText={setOtherCourier}
          placeholder={t('e.g. Swift Logistics')}
          maxLength={60}
        />
      ) : null}

      <TextField
        label={t('Tracking ID')}
        value={trackingId}
        onChangeText={text => {
          setTrackingId(text);
          setErrors(e => ({ ...e, tracking: undefined }));
        }}
        placeholder="e.g. 7723918845"
        autoCapitalize="characters"
        maxLength={60}
        error={errors.tracking}
        hint={t("It's printed on the courier's booking receipt.")}
      />
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  intro: { marginBottom: spacing.xl },
  label: { marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  option: {
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { marginTop: -spacing.sm, marginBottom: spacing.lg },
}));
