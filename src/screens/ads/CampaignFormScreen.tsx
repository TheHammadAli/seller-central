import { Info } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { getCampaign, saveCampaign } from '../../api';
import {
  AppText,
  Button,
  Card,
  DateField,
  Header,
  PriceTag,
  ProductPickerModal,
  Screen,
  Segmented,
  StateView,
  TextField,
  Thumb,
} from '../../components';
import { RootScreenProps } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { CampaignStatus, Product } from '../../types/models';
import { t } from '../../i18n';
import { CampaignDeliveryNotice } from './campaignUi';

export function CampaignFormScreen(props: RootScreenProps<'CampaignForm'>) {
  const shop = useAuth().seller?.shop;
  return (
    <CampaignEditor
      {...props}
      key={`${shop?.id}:${props.route.params?.campaignId ?? 'new'}`}
      shopId={shop?.id ?? ''}
      shopTitle={shop?.name ?? ''}
    />
  );
}

function dayBoundary(date: Date, end = false) {
  const result = new Date(date);
  result.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return result;
}

function CampaignEditor({
  route,
  navigation,
  shopId,
  shopTitle,
}: RootScreenProps<'CampaignForm'> & { shopId: string; shopTitle: string }) {
  const campaignId = route.params?.campaignId;
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<'product' | 'shop'>('product');
  const [product, setProduct] = useState<{
    id: string;
    title: string;
    image?: string | null;
    full?: Product;
  } | null>(null);
  const [budget, setBudget] = useState('');
  const [start, setStart] = useState<Date | undefined>(dayBoundary(new Date()));
  const [end, setEnd] = useState<Date | undefined>();
  const [status, setStatus] =
    useState<Exclude<CampaignStatus, 'completed'>>('active');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!campaignId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<'name' | 'product' | 'budget' | 'start' | 'end', string>>
  >({});

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getCampaign(shopId, campaignId)
      .then(c => {
        if (cancelled) return;
        setName(c.name);
        setTargetType(c.targetType);
        setProduct(
          c.productId
            ? { id: c.productId, title: c.productTitle, image: c.productImage }
            : null,
        );
        setBudget(String(c.budget));
        setStart(new Date(c.startDate));
        setEnd(new Date(c.endDate));
        setStatus(c.status === 'paused' ? 'paused' : 'active');
        setCompleted(c.status === 'completed');
      })
      .catch(e => {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : t('Could not load the campaign'),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId, campaignId, attempt]);

  const save = async () => {
    if (saving || loading || loadError || completed) return;
    const amount = Number(budget);
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('Give the campaign a name');
    if (targetType === 'product' && !product)
      next.product = t('Choose the product to promote');
    if (!Number.isInteger(amount) || amount < 500)
      next.budget = t('The budget must be at least Rs 500');
    else if (amount > 20000000)
      next.budget = t('The maximum budget is Rs 20,000,000');
    if (!start) next.start = t('Choose a start date');
    if (!end) next.end = t('Choose an end date');
    else if (start && end <= start)
      next.end = t('End date must be after the start date');
    else if (end <= new Date()) next.end = t('End date must be in the future');
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    try {
      await saveCampaign(
        shopId,
        {
          name: name.trim(),
          targetType,
          productId: targetType === 'product' ? product!.id : null,
          budget: amount,
          startDate: (start as Date).toISOString(),
          endDate: (end as Date).toISOString(),
          status,
        },
        campaignId,
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        t('Could not save the campaign'),
        e instanceof Error ? e.message : '',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadError) {
    return (
      <Screen header={<Header title={t('Edit campaign')} />}>
        <StateView
          error={loadError}
          onRetry={() => setAttempt(value => value + 1)}
        />
      </Screen>
    );
  }
  if (completed) {
    return (
      <Screen header={<Header title={t('Campaign')} />}>
        <AppText>
          {t('A completed campaign cannot be edited or restarted.')}
        </AppText>
        <Button title={t('Done')} onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <Header title={campaignId ? t('Edit campaign') : t('New campaign')} />
      }
      footer={
        <Button
          title={campaignId ? t('Save campaign') : t('Create campaign')}
          flex
          loading={saving}
          onPress={save}
        />
      }
    >
      <CampaignDeliveryNotice />
      <TextField
        label={t('Campaign name')}
        value={name}
        onChangeText={text => {
          setName(text);
          setErrors(e => ({ ...e, name: undefined }));
        }}
        placeholder={t('e.g. Eid Kurta Push')}
        maxLength={60}
        error={errors.name}
      />

      <AppText variant="label" style={styles.label}>
        {t('Promote')}
      </AppText>
      <Segmented
        options={[
          { key: 'product', label: t('Product') },
          { key: 'shop', label: t('Business') },
        ]}
        value={targetType}
        onChange={value => {
          setTargetType(value);
          setErrors(e => ({ ...e, product: undefined }));
        }}
      />
      <AppText variant="label" style={[styles.label, styles.budget]}>
        {targetType === 'shop'
          ? t('Business to promote')
          : t('Product to promote')}
      </AppText>
      {targetType === 'shop' ? (
        <Card>
          <AppText variant="bodyBold">{shopTitle}</AppText>
        </Card>
      ) : product ? (
        <Card style={styles.productCard}>
          <Thumb
            uri={product.full?.images[0] ?? product.image ?? undefined}
            size={52}
          />
          <View style={styles.flex}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {product.title}
            </AppText>
            {product.full ? <PriceTag product={product.full} /> : null}
          </View>
          <Button
            title={t('Change')}
            size="sm"
            variant="ghost"
            onPress={() => setPicking(true)}
          />
        </Card>
      ) : (
        <Pressable
          onPress={() => setPicking(true)}
          style={[styles.pick, !!errors.product && styles.pickError]}
        >
          <AppText variant="bodyBold" color={colors.primary}>
            {t('Choose a product')}
          </AppText>
        </Pressable>
      )}
      {errors.product ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {errors.product}
        </AppText>
      ) : null}

      <TextField
        label={t('Budget')}
        prefix={t('Rs')}
        value={budget}
        onChangeText={text => {
          setBudget(text.replace(/\D/g, ''));
          setErrors(e => ({ ...e, budget: undefined }));
        }}
        keyboardType="number-pad"
        placeholder="e.g. 3000"
        error={errors.budget}
        hint={t('The most this campaign will spend in total.')}
        style={styles.budget}
      />

      <View style={styles.dates}>
        <DateField
          label={t('Start date')}
          value={start}
          onChange={d => {
            setStart(d ? dayBoundary(d) : undefined);
            setErrors(e => ({ ...e, start: undefined }));
          }}
          minimumDate={campaignId ? undefined : dayBoundary(new Date())}
          error={errors.start}
          style={styles.flex}
        />
        <DateField
          label={t('End date')}
          value={end}
          onChange={d => {
            setEnd(d ? dayBoundary(d, true) : undefined);
            setErrors(e => ({ ...e, end: undefined }));
          }}
          minimumDate={start}
          error={errors.end}
          style={styles.flex}
        />
      </View>

      <AppText variant="label" style={styles.label}>
        {t('Status')}
      </AppText>
      <Segmented
        options={[
          { key: 'active', label: t('Active') },
          { key: 'paused', label: t('Paused') },
        ]}
        value={status}
        onChange={setStatus}
      />

      <View style={styles.note}>
        <Info size={16} color={colors.textMuted} />
        <AppText variant="caption" color={colors.textMuted} style={styles.flex}>
          {t(
            'The campaign stops by itself when it reaches its budget or end date. You can pause it any time.',
          )}
        </AppText>
      </View>

      <ProductPickerModal
        visible={picking}
        onClose={() => setPicking(false)}
        subtitle={t('The product this campaign promotes.')}
        onSelect={p => {
          setProduct({ id: p.id, title: p.title, full: p });
          setErrors(e => ({ ...e, product: undefined }));
        }}
      />
    </Screen>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    label: { marginBottom: spacing.sm },
    productCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    pick: {
      height: 56,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickError: { borderColor: colors.danger },
    error: { marginTop: spacing.xs },
    budget: { marginTop: spacing.lg },
    dates: { flexDirection: 'row', gap: spacing.md },
    note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  }),
);
