import { RouteProp, useRoute } from '@react-navigation/native';
import { ClipboardList, Search } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { listOrders } from '../../api';
import { EmptyState, FilterChips, Header, OrderCard, Screen, StateView } from '../../components';
import { useLoad } from '../../hooks/useLoad';
import { TabParamList } from '../../navigation/types';
import { colors, fonts, radius, spacing, themedStyles } from '../../theme';
import { Order, OrderStatus } from '../../types/models';
import { IN_DELIVERY_STATUSES, PENDING_STATUSES } from '../../utils/orders';
import { t } from '../../i18n';
import { useAuth } from '../../state/AuthContext';

type FilterKey = 'all' | 'pending' | 'delivery' | 'delivered' | 'cancelled' | 'returns';

const FILTERS: { key: FilterKey; label: string; statuses?: OrderStatus[] }[] = [
  { key: 'pending', label: t('Pending'), statuses: PENDING_STATUSES },
  { key: 'delivery', label: t('On the way'), statuses: IN_DELIVERY_STATUSES },
  { key: 'delivered', label: t('Delivered'), statuses: ['delivered'] },
  { key: 'cancelled', label: t('Cancelled'), statuses: ['cancelled'] },
  { key: 'returns', label: t('Returns'), statuses: ['returned', 'refunded'] },
  { key: 'all', label: t('All') },
];

function toFilter(param?: string): FilterKey | undefined {
  if (param === 'new') return 'pending';
  return FILTERS.some(f => f.key === param) ? (param as FilterKey) : undefined;
}

export function OrdersScreen() {
  const route = useRoute<RouteProp<TabParamList, 'Orders'>>();
  const [filter, setFilter] = useState<FilterKey>(toFilter(route.params?.filter) ?? 'pending');
  const [query, setQuery] = useState('');
  const shopId = useAuth().seller?.shop?.id;
  const { data, error, reload, refresh, refreshing } = useLoad(
    () => (shopId ? listOrders(shopId) : Promise.resolve([])),
    [shopId],
  );

  // Opened again from the dashboard with a different filter.
  useEffect(() => {
    const next = toFilter(route.params?.filter);
    if (next) setFilter(next);
  }, [route.params?.filter]);

  const counts = useMemo(() => {
    const c: Partial<Record<FilterKey, number>> = {};
    for (const f of FILTERS) {
      c[f.key] = f.statuses ? (data ?? []).filter(o => f.statuses!.includes(o.status)).length : data?.length;
    }
    return c;
  }, [data]);

  const shown = useMemo(() => {
    const f = FILTERS.find(x => x.key === filter);
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter(o => !f?.statuses || f.statuses.includes(o.status))
      .filter(
        o =>
          !q ||
          o.number.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.items.some(i => i.title.toLowerCase().includes(q)),
      )
      // New orders first: they're waiting on the seller.
      .sort((a, b) => Number(b.status === 'new') - Number(a.status === 'new'));
  }, [data, filter, query]);

  return (
    <Screen header={<Header title={t('Orders')} back={false} />} scroll={false} padded={false} bottomInset={false}>
      <View style={styles.search}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('Search order no., customer or product')}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
        />
      </View>
      <FilterChips
        items={FILTERS.map(f => ({ key: f.key, label: f.label, count: counts[f.key] }))}
        value={filter}
        onChange={setFilter}
      />
      {!data ? (
        <StateView error={error} onRetry={reload} />
      ) : (
        <FlatList<Order>
          data={shown}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <OrderCard order={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={ClipboardList}
              title={query ? t('No matching orders') : t('No orders here')}
              message={
                query
                  ? t('Try another order number or name.')
                  : t('Orders customers place on Fazl appear here automatically.')
              }
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  search: {
    marginHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, paddingVertical: 0 },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
}));
