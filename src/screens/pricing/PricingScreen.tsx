import { BadgePercent, CalendarDays, Tag } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { listShopProducts } from '../../api/shopContent';
import {
  AppText,
  Badge,
  Button,
  Card,
  ComingSoon,
  EmptyState,
  FilterChips,
  Header,
  IconCircle,
  ProductPickerModal,
  Screen,
  StateView,
  Thumb,
} from '../../components';
import { FEATURES } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { RootScreenProps } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing, Tone } from '../../theme';
import { Product } from '../../types/models';
import { formatDayMonth, formatRs } from '../../utils/format';
import { saleState, SaleState } from '../../utils/products';
import { SaleSheet } from './SaleSheet';
import { isUrdu, t } from '../../i18n';

type Group = Exclude<SaleState, 'none'>;

const GROUP_LABEL: Record<Group, string> = { running: t('Running'), scheduled: t('Scheduled'), ended: t('Ended') };
const GROUP_TONE: Record<Group, Tone> = { running: 'success', scheduled: 'info', ended: 'neutral' };

export function PricingScreen(props: RootScreenProps<'Pricing'>) {
  if (!FEATURES.sale) {
    return (
      <ComingSoon
        title={t('Pricing & Promotions')}
        icon={BadgePercent}
        message={t("Sale prices with start and end dates are being added to Fazl. Once they're live, you'll run every sale from here.")}
      />
    );
  }
  return <PricingContent {...props} />;
}

/**
 * Every sale of the shop's products in one place: put a product on sale,
 * change a sale or end it (SaleSheet). Fazl starts and ends each sale by
 * itself on its dates.
 */
function PricingContent(_props: RootScreenProps<'Pricing'>) {
  const shopId = useAuth().seller?.shop?.id;
  const [group, setGroup] = useState<Group>('running');
  const [picking, setPicking] = useState(false);
  /** The product whose sale is being set. */
  const [editing, setEditing] = useState<Product | null>(null);
  const { data, error, reload, refresh, refreshing } = useLoad(
    () => (shopId ? listShopProducts(shopId) : Promise.resolve<Product[]>([])),
    [shopId],
  );

  const byGroup = useMemo(() => {
    const g: Record<Group, Product[]> = { running: [], scheduled: [], ended: [] };
    for (const p of data ?? []) {
      const s = saleState(p);
      if (s !== 'none') g[s].push(p);
    }
    return g;
  }, [data]);

  return (
    <Screen
      header={<Header title={t('Pricing & Promotions')} />}
      scroll={false}
      padded={false}
      footer={<Button title={t('Create a sale')} icon={BadgePercent} flex onPress={() => setPicking(true)} />}
    >
      {!data ? (
        <StateView error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={byGroup[group]}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View>
              <Card style={styles.intro}>
                <IconCircle icon={CalendarDays} tone="info" />
                <AppText color={colors.textMuted} style={styles.flex}>
                  {t('A sale starts and ends by itself on the dates you set. After it ends, Fazl shows the regular price again.')}
                </AppText>
              </Card>
              <FilterChips
                bleed
                items={(Object.keys(GROUP_LABEL) as Group[]).map(k => ({
                  key: k,
                  label: GROUP_LABEL[k],
                  count: byGroup[k].length,
                }))}
                value={group}
                onChange={setGroup}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={Tag}
              title={t(`No ${group} sales`)}
              message={t('Create a sale to show a lower price for a while.')}
            />
          }
          renderItem={({ item }) => {
            const sale = item.salePrice as number;
            const off = Math.round((1 - sale / item.price) * 100);
            return (
              <Card onPress={() => setEditing(item)} style={styles.card}>
                <Thumb uri={item.images[0]} size={60} />
                <View style={styles.flex}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <View style={styles.prices}>
                    <AppText variant="bodyBold" color={colors.danger}>
                      {formatRs(sale)}
                    </AppText>
                    <AppText variant="caption" color={colors.textSubtle} style={styles.struck}>
                      {formatRs(item.price)}
                    </AppText>
                    <Badge label={t('{percent}% off', { percent: off })} tone="danger" />
                  </View>
                  <AppText variant="caption" color={colors.textMuted}>
                    {item.saleStart ? formatDayMonth(item.saleStart) : t('Now')} {isUrdu ? '←' : '→'}{' '}
                    {item.saleEnd ? formatDayMonth(item.saleEnd) : t('no end date')}
                  </AppText>
                </View>
                <Badge label={GROUP_LABEL[group]} tone={GROUP_TONE[group]} />
              </Card>
            );
          }}
        />
      )}
      <ProductPickerModal
        visible={picking}
        onClose={() => setPicking(false)}
        title={t('Choose a product')}
        subtitle={t('The product to put on sale. Only products with a price are listed.')}
        // A sale is a price below the regular one, so only priced products.
        only={p => p.price > 0}
        emptyText={t('Only a product with a price can go on sale. Add a price to one first.')}
        onSelect={setEditing}
      />
      <SaleSheet
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  prices: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  struck: { textDecorationLine: 'line-through' },
});
