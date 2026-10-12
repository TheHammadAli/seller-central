import { Truck } from 'lucide-react-native';
import { ChevronForward } from '../../components/Chevrons';
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
  IconCircle,
  Screen,
  StateView,
} from '../../components';
import { useLoad } from '../../hooks/useLoad';
import { RootScreenProps } from '../../navigation/types';
import { colors, spacing, Tone } from '../../theme';
import { Order } from '../../types/models';
import { formatDayMonth } from '../../utils/format';
import { TRACKING_STEPS } from '../../utils/orders';
import { t } from '../../i18n';
import { useAuth } from '../../state/AuthContext';

type FilterKey = 'needs' | 'transit' | 'out' | 'delivered';

const FILTERS: { key: FilterKey; label: string; test: (o: Order) => boolean }[] = [
  // Ready and not yet sent: tap one to book it with a courier.
  { key: 'needs', label: t('Ready to ship'), test: o => o.status === 'ready' },
  {
    key: 'transit',
    label: t('In transit'),
    test: o => o.status === 'shipped' && ['shipped', 'in_transit'].includes(o.delivery.trackingStatus ?? ''),
  },
  { key: 'out', label: t('Out for delivery'), test: o => o.status === 'out_for_delivery' },
  { key: 'delivered', label: t('Delivered'), test: o => o.delivery.trackingStatus === 'delivered' },
];

const TRACK_TONE: Record<string, Tone> = {
  shipped: 'info',
  in_transit: 'purple',
  out_for_delivery: 'warning',
  delivered: 'success',
};

/** Delivery orders sent with a courier, and those ready to be sent. */
export function ShippingScreen({ navigation }: RootScreenProps<'Shipping'>) {
  const [filter, setFilter] = useState<FilterKey>('needs');
  const shopId = useAuth().seller?.shop?.id;
  const { data, error, reload, refresh, refreshing } = useLoad(async () => {
    const orders = shopId ? await listOrders(shopId) : [];
    return orders.filter(
      o => o.fulfilment === 'delivery' && (o.status === 'ready' || o.delivery.type === 'nationwide'),
    );
  }, [shopId]);

  const groups = useMemo(
    () => Object.fromEntries(FILTERS.map(f => [f.key, (data ?? []).filter(f.test)])) as Record<FilterKey, Order[]>,
    [data],
  );

  return (
    <Screen header={<Header title={t('Shipping & Tracking')} />} scroll={false} padded={false}>
      <FilterChips
        items={FILTERS.map(f => ({ key: f.key, label: f.label, count: groups[f.key].length }))}
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
          ListEmptyComponent={
            <EmptyState
              icon={Truck}
              title={t('Nothing here')}
              message={
                filter === 'needs'
                  ? t('No delivery orders are ready to ship.')
                  : t('No shipments at this stage.')
              }
            />
          }
          renderItem={({ item }) => {
            const d = item.delivery;
            const step = TRACKING_STEPS.find(s => s.status === d.trackingStatus);
            return (
              <Card
                onPress={() =>
                  filter === 'needs'
                    ? navigation.navigate('CourierForm', { orderId: item.id })
                    : navigation.navigate('OrderDetail', { orderId: item.id })
                }
                style={styles.card}
              >
                <IconCircle icon={Truck} tone="info" size={40} />
                <View style={styles.flex}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {item.number} · {item.customer.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                    {d.courier
                      ? `${d.courier} · ${d.trackingId}`
                      : t('Packed {date} · tap to add tracking', { date: formatDayMonth(item.history[item.history.length - 1].at) })}
                  </AppText>
                </View>
                {step ? (
                  <Badge label={step.label} tone={TRACK_TONE[step.status]} />
                ) : (
                  <ChevronForward size={20} color={colors.textSubtle} />
                )}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
});
