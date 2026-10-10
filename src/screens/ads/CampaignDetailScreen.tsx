import {
  Banknote,
  Eye,
  MousePointerClick,
  Pencil,
  Percent,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { getCampaign, setCampaignStatus } from '../../api';
import {
  AppText,
  Button,
  Card,
  Header,
  InfoRow,
  Screen,
  SectionHeader,
  StatCard,
  StateView,
} from '../../components';
import { useLoad } from '../../hooks/useLoad';
import { useAuth } from '../../state/AuthContext';
import { RootScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { CampaignStatus } from '../../types/models';
import {
  formatCompact,
  formatDate,
  formatRs,
  percent,
} from '../../utils/format';
import { BudgetBar, CampaignBadge, CampaignDeliveryNotice } from './campaignUi';
import { t } from '../../i18n';

export function CampaignDetailScreen({
  route,
  navigation,
}: RootScreenProps<'CampaignDetail'>) {
  const { campaignId } = route.params;
  const shopId = useAuth().seller?.shop?.id ?? '';
  const {
    data: c,
    setData,
    error,
    reload,
    refresh,
    refreshing,
  } = useLoad(() => getCampaign(shopId, campaignId), [shopId, campaignId]);
  const [busy, setBusy] = useState(false);

  if (!c) {
    return (
      <Screen header={<Header title={t('Campaign')} />} scroll={false}>
        <StateView error={error} onRetry={reload} />
      </Screen>
    );
  }

  const change = async (status: CampaignStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      setData(await setCampaignStatus(shopId, c.id, status));
    } catch (e) {
      Alert.alert(
        t('Could not update the campaign'),
        e instanceof Error ? e.message : '',
      );
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const complete = () =>
    Alert.alert(
      t('End this campaign now?'),
      t('A completed campaign cannot be edited or restarted.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('End campaign'),
          style: 'destructive',
          onPress: () => change('completed'),
        },
      ],
    );

  const roas = c.spent ? (c.sales / c.spent).toFixed(1) : '0';

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      header={
        <Header
          title={c.name}
          subtitle={c.productTitle}
          right={
            c.status !== 'completed' ? (
              <Pressable
                disabled={busy}
                onPress={() =>
                  navigation.navigate('CampaignForm', { campaignId: c.id })
                }
                hitSlop={10}
                accessibilityLabel={t('Edit campaign')}
              >
                <Pencil size={20} color={colors.primary} />
              </Pressable>
            ) : undefined
          }
        />
      }
      footer={
        c.status === 'completed' ? undefined : (
          <>
            <Button
              title={t('End now')}
              variant="danger"
              flex
              disabled={busy}
              onPress={complete}
            />
            <Button
              title={c.status === 'active' ? t('Pause') : t('Resume')}
              flex
              loading={busy}
              onPress={() =>
                change(c.status === 'active' ? 'paused' : 'active')
              }
            />
          </>
        )
      }
    >
      {!c.deliveryEnabled ? <CampaignDeliveryNotice /> : null}
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
      <Card style={styles.budgetCard}>
        <View style={styles.statusRow}>
          <AppText variant="subheading">{t('Budget')}</AppText>
          <CampaignBadge campaign={c} />
        </View>
        <BudgetBar campaign={c} />
        <InfoRow
          label={t('Runs')}
          value={`${formatDate(c.startDate)} – ${formatDate(c.endDate)}`}
        />
      </Card>

      <SectionHeader title={t('Performance')} />
      <View style={styles.grid}>
        <StatCard
          icon={Eye}
          tone="info"
          label={t('Views')}
          value={formatCompact(c.impressions)}
        />
        <StatCard
          icon={MousePointerClick}
          tone="purple"
          label={t('Clicks')}
          value={formatCompact(c.clicks)}
        />
        <StatCard
          icon={Percent}
          tone="secondary"
          label={t('Click rate')}
          value={percent(c.clicks, c.impressions)}
        />
        <StatCard
          icon={ShoppingBag}
          tone="primary"
          label={t('Orders')}
          value={String(c.orders)}
        />
        <StatCard
          icon={Wallet}
          tone="warning"
          label={t('Amount spent')}
          value={formatRs(c.spent)}
        />
        <StatCard
          icon={Banknote}
          tone="success"
          label={t('Sales generated')}
          value={formatRs(c.sales)}
        />
      </View>

      <Card style={styles.roas}>
        <TrendingUp size={22} color={colors.primary} />
        <AppText style={styles.flex}>
          {t('Every')} <AppText variant="bodyBold">{t('Rs 1')}</AppText>{' '}
          {t('spent brought')}{' '}
          <AppText variant="bodyBold" color={colors.success}>
            {t('Rs')} {roas}
          </AppText>{' '}
          {t('in sales.')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  budgetCard: { gap: spacing.md },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  roas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
