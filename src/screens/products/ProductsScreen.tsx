import { useNavigation } from '@react-navigation/native';
import { Package, Plus, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { getSettings } from '../../api';
import { listShopProducts, setProductAvailable } from '../../api/shopContent';
import {
  AppSwitch,
  AppText,
  Badge,
  Card,
  EmptyState,
  FilterChips,
  Header,
  PriceTag,
  Screen,
  StateView,
  Thumb,
} from '../../components';
import { FEATURES } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { useAuth } from '../../state/AuthContext';
import { colors, fonts, radius, spacing, themedStyles } from '../../theme';
import { Product } from '../../types/models';
import { saleState, stockState, totalStock } from '../../utils/products';
import { t } from '../../i18n';

type FilterKey = 'all' | 'live' | 'hidden' | 'sale' | 'low' | 'out';

/** The active shop's products, exactly as listed on Fazl. */
export function ProductsScreen() {
  const navigation = useNavigation();
  const shop = useAuth().seller?.shop;
  const shopId = shop?.id ?? '';
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const { data, setData, error, reload, refresh, refreshing } = useLoad(async () => {
    const [products, settings] = await Promise.all([listShopProducts(shopId), getSettings()]);
    return { products, low: settings.lowStockThreshold };
  }, [shopId]);

  const groups = useMemo(() => {
    const products = data?.products ?? [];
    const low = data?.low ?? 5;
    return {
      all: products,
      live: products.filter(p => p.available),
      hidden: products.filter(p => !p.available),
      sale: products.filter(p => ['running', 'scheduled'].includes(saleState(p))),
      low: products.filter(p => stockState(p, low) === 'low'),
      out: products.filter(p => stockState(p, low) === 'out'),
    } as Record<FilterKey, Product[]>;
  }, [data]);

  const shown = groups[filter].filter(p => p.title.toLowerCase().includes(query.trim().toLowerCase()));

  // Hidden products drop out of everything customers see on Fazl.
  const setAvailable = async (product: Product, available: boolean) => {
    const flip = (value: boolean) =>
      setData(d => d && { ...d, products: d.products.map(p => (p.id === product.id ? { ...p, available: value } : p)) });
    flip(available);
    try {
      await setProductAvailable(product.id, available);
    } catch (e) {
      flip(!available);
      Alert.alert(
        available ? t("Couldn't show this product") : t("Couldn't hide this product"),
        e instanceof Error ? e.message : '',
      );
    }
  };

  return (
    <Screen
      header={
        <Header
          title={t('Products')}
          subtitle={
            data
              ? `${shop?.name} · ${t(data.products.length === 1 ? '{count} product' : '{count} products', {
              count: data.products.length,
            })}`
              : shop?.name
          }
          back={false}
          right={
            <Pressable
              onPress={() => navigation.navigate('ProductForm')}
              style={styles.add}
              accessibilityLabel={t('Add product')}
            >
              <Plus size={22} color={colors.white} />
            </Pressable>
          }
        />
      }
      scroll={false}
      padded={false}
      bottomInset={false}
    >
      <View style={styles.search}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('Search products')}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
        />
      </View>
      <FilterChips
        items={[
          { key: 'all', label: t('All'), count: groups.all.length },
          { key: 'live', label: t('Live on Fazl'), count: groups.live.length },
          { key: 'hidden', label: t('Hidden'), count: groups.hidden.length },
          ...(FEATURES.sale ? [{ key: 'sale' as const, label: t('On sale'), count: groups.sale.length }] : []),
          ...(FEATURES.stock
            ? [
                { key: 'low' as const, label: t('Low stock'), count: groups.low.length },
                { key: 'out' as const, label: t('Out of stock'), count: groups.out.length },
              ]
            : []),
        ]}
        value={filter}
        onChange={setFilter}
      />
      {!data ? (
        <StateView error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon={Package}
              title={data.products.length ? t('Nothing here') : t('Add your first product')}
              message={
                data.products.length
                  ? t('No products match your search.')
                  : t('Products you add here show in your shop on Fazl for customers to order.')
              }
              actionLabel={data.products.length ? undefined : 'Add product'}
              onAction={() => navigation.navigate('ProductForm')}
            />
          }
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('ProductForm', { productId: item.id })} style={styles.card}>
              <Thumb uri={item.images[0]} size={72} />
              <View style={styles.body}>
                <AppText variant="bodyBold" numberOfLines={2}>
                  {item.title}
                </AppText>
                <PriceTag product={item} />
                <View style={styles.badges}>
                  {FEATURES.stock ? (
                    <StockBadge product={item} low={data.low} />
                  ) : item.category ? (
                    <Badge label={item.category} tone="primary" />
                  ) : null}
                  {item.video ? <Badge label={t('Video')} tone="purple" /> : null}
                  {item.options.length ? (
                    <Badge label={item.options.map(o => o.name).join(', ')} />
                  ) : null}
                  {item.disabledByFazl ? <Badge label={t('Disabled by Fazl')} tone="danger" /> : null}
                </View>
              </View>
              {/* The admin's disable can't be undone from here. */}
              {item.disabledByFazl ? null : (
                <View style={styles.side}>
                  <AppSwitch value={item.available} onChange={v => setAvailable(item, v)} />
                  <AppText variant="small" color={item.available ? colors.primary : colors.textMuted}>
                    {item.available ? t('Live') : t('Hidden')}
                  </AppText>
                </View>
              )}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function StockBadge({ product, low }: { product: Product; low: number }) {
  const state = stockState(product, low);
  return (
    <Badge
      label={state === 'out' ? t('Out of stock') : t('{count} in stock', { count: totalStock(product) })}
      tone={state === 'out' ? 'danger' : state === 'low' ? 'warning' : 'success'}
    />
  );
}

const styles = themedStyles(() => StyleSheet.create({
  add: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  body: { flex: 1, gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  side: { alignItems: 'center', gap: 2 },
}));
