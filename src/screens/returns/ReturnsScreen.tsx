import { RotateCcw } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { listOrders } from '../../api';
import {
  AppText,
  Badge,
  Card,
  EmptyState,
  FilterChips,
  Header,
  Screen,
  StateView,
} from '../../components';
import { useLoad } from '../../hooks/useLoad';
import { RootScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { Order, OrderStatus } from '../../types/models';
import { formatRs, timeAgo } from '../../utils/format';
import { STATUS_LABELS, STATUS_TONES } from '../../utils/orders';
import { t } from '../../i18n';
import { useAuth } from '../../state/AuthContext';

type FilterKey = Extract<OrderStatus, 'returned' | 'refunded' | 'cancelled'>;

const HINT: Record<FilterKey, string> = {
  returned: t('Returned to you — refund the customer to close the order.'),
  refunded: t('Refund recorded. It comes off your earnings.'),
  cancelled: t('Cancelled before delivery.'),
};

export function ReturnsScreen({ navigation }: RootScreenProps<'Returns'>) {
  const [filter, setFilter] = useState<FilterKey>('returned');
  const shopId = useAuth().seller?.shop?.id;
  const { data, error, reload, refresh, refreshing } = useLoad(
    () => (shopId ? listOrders(shopId) : Promise.resolve([])),
    [shopId],
  );

  const groups = useMemo(() => {
    const g: Record<FilterKey, Order[]> = { returned: [], refunded: [], cancelled: [] };
    for (const o of data ?? []) if (o.status in g) g[o.status as FilterKey].push(o);
    return g;
  }, [data]);

  return (
    <Screen header={<Header title={t('Returns & Refunds')} />} scroll={false} padded={false}>
      <FilterChips
        items={[
          { key: 'returned', label: t('Awaiting refund'), count: groups.returned.length },
          { key: 'refunded', label: t('Refunded'), count: groups.refunded.length },
          { key: 'cancelled', label: t('Cancelled'), count: groups.cancelled.length },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {!data ? (
        <StateView error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={groups[filter]}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListHeaderComponent={
            <AppText variant="caption" color={colors.textMuted}>
              {HINT[filter]}
            </AppText>
          }
          ListEmptyComponent={<EmptyState icon={RotateCcw} title={t('Nothing here')} message={t('No orders in this group.')} />}
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })} style={styles.card}>
              <View style={styles.top}>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">
                    {item.number} · {item.customer.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                    {item.items.map(i => i.title).join(', ')}
                  </AppText>
                </View>
                <Badge label={STATUS_LABELS[item.status]} tone={STATUS_TONES[item.status]} />
              </View>
              {item.cancelReason || item.returnReason ? (
                <AppText variant="caption">
                  {t('Reason: {reason}', { reason: t(item.cancelReason ?? item.returnReason ?? '') })}
                </AppText>
              ) : null}
              <View style={styles.bottom}>
                <AppText variant="caption" color={colors.textMuted}>
                  {timeAgo(item.history[item.history.length - 1].at)}
                </AppText>
                <AppText variant="bodyBold" color={item.refund ? colors.danger : colors.text}>
                  {item.refund ? t('Refunded {amount}', { amount: formatRs(item.refund) }) : formatRs(item.subtotal)}
                </AppText>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
