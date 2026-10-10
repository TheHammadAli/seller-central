import { Boxes, PackageX, TriangleAlert } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { getSettings, listProducts, setStock } from '../../api';
import {
  AppText,
  Badge,
  Card,
  ComingSoon,
  EmptyState,
  FilterChips,
  Header,
  Screen,
  StateView,
  StatCard,
  Stepper,
  Thumb,
} from '../../components';
import { FEATURES } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { RootScreenProps } from '../../navigation/types';
import { colors, spacing, themedStyles } from '../../theme';
import { Product } from '../../types/models';
import { stockState, totalStock } from '../../utils/products';
import { t } from '../../i18n';

type FilterKey = 'all' | 'low' | 'out';

export function InventoryScreen(props: RootScreenProps<'Inventory'>) {
  if (!FEATURES.stock) {
    return (
      <ComingSoon
        title={t('Inventory')}
        icon={Boxes}
        message={t("Stock counts are being added to Fazl. Once they're live, you'll manage every product's stock here and Fazl will show 'Out of stock' by itself.")}
      />
    );
  }
  return <InventoryContent {...props} />;
}

/** Stock for every product (and each of its variants), changed in place. */
function InventoryContent({ route, navigation }: RootScreenProps<'Inventory'>) {
  const [filter, setFilter] = useState<FilterKey>(route.params?.filter ?? 'all');
  const { data, setData, error, reload, refresh, refreshing } = useLoad(async () => {
    const [products, settings] = await Promise.all([listProducts(), getSettings()]);
    return { products, low: settings.lowStockThreshold };
  });

  const summary = useMemo(() => {
    const products = data?.products ?? [];
    const low = data?.low ?? 5;
    return {
      units: products.reduce((s, p) => s + totalStock(p), 0),
      low: products.filter(p => stockState(p, low) === 'low').length,
      out: products.filter(p => stockState(p, low) === 'out').length,
    };
  }, [data]);

  const change = (product: Product, value: number, variant?: string) => {
    // Show the new number at once; the save happens behind it.
    setData(d =>
      d && {
        ...d,
        products: d.products.map(p =>
          p.id !== product.id
            ? p
            : variant
            ? { ...p, variants: p.variants.map(v => (v.label === variant ? { ...v, stock: value } : v)) }
            : { ...p, stock: value },
        ),
      },
    );
    setStock(product.id, value, variant);
  };

  const shown = (data?.products ?? []).filter(p => filter === 'all' || stockState(p, data?.low ?? 5) === filter);

  return (
    <Screen header={<Header title={t('Inventory')} />} scroll={false} padded={false}>
      {!data ? (
        <StateView error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View>
              <View style={styles.stats}>
                <StatCard compact icon={Boxes} label={t('Units in stock')} value={String(summary.units)} />
                <StatCard compact icon={TriangleAlert} tone="warning" label={t('Low (≤ {count})', { count: data.low })} value={String(summary.low)} />
                <StatCard compact icon={PackageX} tone="danger" label={t('Out of stock')} value={String(summary.out)} />
              </View>
              <FilterChips
                bleed
                items={[
                  { key: 'all', label: t('All'), count: data.products.length },
                  { key: 'low', label: t('Low stock'), count: summary.low },
                  { key: 'out', label: t('Out of stock'), count: summary.out },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={Boxes}
              title={t('Nothing here')}
              message={filter === 'all' ? t('Add products to manage their stock.') : t('No products in this group. Nice!')}
            />
          }
          renderItem={({ item }) => {
            const total = totalStock(item);
            const state = stockState(item, data.low);
            return (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Thumb uri={item.images[0]} size={48} />
                  <View style={styles.flex}>
                    <AppText
                      variant="bodyBold"
                      numberOfLines={1}
                      onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
                    >
                      {item.title}
                    </AppText>
                    <View style={styles.badgeRow}>
                      <Badge
                        label={state === 'out' ? t('Out of stock') : t('{count} in stock', { count: total })}
                        tone={state === 'out' ? 'danger' : state === 'low' ? 'warning' : 'success'}
                      />
                      {!item.available ? <Badge label={t('Hidden')} /> : null}
                    </View>
                  </View>
                  {item.variants.length ? null : (
                    <Stepper value={item.stock} onChange={n => change(item, n)} />
                  )}
                </View>
                {item.variants.map(v => (
                  <View key={v.label} style={styles.variantRow}>
                    <AppText style={styles.flex} color={v.stock === 0 ? colors.danger : colors.text}>
                      {v.label}
                      {v.stock === 0 ? `  · ${t('out')}` : ''}
                    </AppText>
                    <Stepper value={v.stock} onChange={n => change(item, n, v.label)} />
                  </View>
                ))}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  card: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
}));
