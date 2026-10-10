import { Megaphone, Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { listCampaigns } from '../../api';
import {
  AppText,
  Card,
  EmptyState,
  FilterChips,
  Header,
  Screen,
  StateView,
} from '../../components';
import { useLoad } from '../../hooks/useLoad';
import { useAuth } from '../../state/AuthContext';
import { RootScreenProps } from '../../navigation/types';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { CampaignStatus } from '../../types/models';
import { formatCompact, formatDayMonth, formatRs } from '../../utils/format';
import { BudgetBar, CampaignBadge, CampaignDeliveryNotice } from './campaignUi';
import { t } from '../../i18n';

export function AdsScreen({ navigation }: RootScreenProps<'Ads'>) {
  const shopId = useAuth().seller?.shop?.id ?? '';
  const [filter, setFilter] = useState<'all' | 'scheduled' | CampaignStatus>(
    'all',
  );
  const { data, error, reload, refresh, refreshing } = useLoad(
    () => listCampaigns(shopId),
    [shopId],
  );

  const totals = useMemo(
    () =>
      (data ?? []).reduce(
        (sum, c) => ({
          spent: sum.spent + c.spent,
          sales: sum.sales + c.sales,
          impressions: sum.impressions + c.impressions,
          clicks: sum.clicks + c.clicks,
          orders: sum.orders + c.orders,
        }),
        { spent: 0, sales: 0, impressions: 0, clicks: 0, orders: 0 },
      ),
    [data],
  );

  const shown = (data ?? []).filter(
    c =>
      filter === 'all' ||
      (filter === 'scheduled'
        ? c.isScheduled
        : c.status === filter && !c.isScheduled),
  );

  return (
    <Screen
      header={
        <Header
          title={t('Advertisement')}
          right={
            <Pressable
              onPress={() => navigation.navigate('CampaignForm')}
              style={styles.add}
              accessibilityLabel={t('New campaign')}
            >
              <Plus size={22} color={colors.white} />
            </Pressable>
          }
        />
      }
      scroll={false}
      padded={false}
    >
      {!data ? (
        <StateView error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              <CampaignDeliveryNotice />
              {error ? <AppText color={colors.danger}>{error}</AppText> : null}
              <View style={styles.summary}>
                <AppText variant="label" color={colors.primaryTint}>
                  {t('All campaigns')}
                </AppText>
                <View style={styles.summaryRow}>
                  <View>
                    <AppText variant="title" color={colors.white}>
                      {formatRs(totals.sales)}
                    </AppText>
                    <AppText variant="caption" color={colors.primaryTint}>
                      {t('sales from ads')}
                    </AppText>
                  </View>
                  <View style={styles.right}>
                    <AppText variant="subheading" color={colors.white}>
                      {formatRs(totals.spent)}
                    </AppText>
                    <AppText variant="caption" color={colors.primaryTint}>
                      {t('spent')}
                    </AppText>
                  </View>
                </View>
                <View style={styles.summaryStats}>
                  <SummaryStat
                    label={t('Views')}
                    value={formatCompact(totals.impressions)}
                  />
                  <SummaryStat
                    label={t('Clicks')}
                    value={formatCompact(totals.clicks)}
                  />
                  <SummaryStat
                    label={t('Orders')}
                    value={String(totals.orders)}
                  />
                </View>
              </View>
              <FilterChips
                bleed
                items={[
                  { key: 'all', label: t('All'), count: data.length },
                  {
                    key: 'active',
                    label: t('Active'),
                    count: data.filter(
                      c => c.status === 'active' && !c.isScheduled,
                    ).length,
                  },
                  {
                    key: 'scheduled',
                    label: t('Scheduled'),
                    count: data.filter(c => c.isScheduled).length,
                  },
                  {
                    key: 'paused',
                    label: t('Paused'),
                    count: data.filter(c => c.status === 'paused').length,
                  },
                  {
                    key: 'completed',
                    label: t('Completed'),
                    count: data.filter(c => c.status === 'completed').length,
                  },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={Megaphone}
              title={t('No campaigns here')}
              message={t('Create a campaign for a product or your business.')}
              actionLabel={t('Create campaign')}
              onAction={() => navigation.navigate('CampaignForm')}
            />
          }
          renderItem={({ item }) => (
            <Card
              onPress={() =>
                navigation.navigate('CampaignDetail', { campaignId: item.id })
              }
              style={styles.card}
            >
              <View style={styles.topRow}>
                <View style={styles.flex}>
                  <AppText variant="subheading" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={colors.textMuted}
                    numberOfLines={1}
                  >
                    {item.productTitle} · {formatDayMonth(item.startDate)} –{' '}
                    {formatDayMonth(item.endDate)}
                  </AppText>
                </View>
                <CampaignBadge campaign={item} />
              </View>
              <BudgetBar campaign={item} />
              <View style={styles.metrics}>
                <Metric
                  label={t('Views')}
                  value={formatCompact(item.impressions)}
                />
                <Metric
                  label={t('Clicks')}
                  value={formatCompact(item.clicks)}
                />
                <Metric label={t('Orders')} value={String(item.orders)} />
                <Metric label={t('Sales')} value={formatCompact(item.sales)} />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <AppText variant="bodyBold" color={colors.white}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.primaryTint}>
        {label}
      </AppText>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="bodyBold">{value}</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    add: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: { padding: spacing.lg, gap: spacing.md },
    summary: {
      // Fazl's teal, like every banner in the app.
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    right: { alignItems: 'flex-end' },
    summaryStats: {
      flexDirection: 'row',
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.3)',
    },
    summaryStat: { flex: 1, alignItems: 'center' },
    card: { gap: spacing.md },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    metrics: { flexDirection: 'row' },
    metric: { flex: 1, alignItems: 'center' },
  }),
);
