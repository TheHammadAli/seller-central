import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  CircleCheck,
  ClipboardList,
  ImagePlus,
  Megaphone,
  PackagePlus,
  Truck,
  Wallet,
  ChevronDown,
} from 'lucide-react-native';
import { ChevronForward } from '../../components/Chevrons';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import ButtonBackground from '../../assets/images/button-background.png';
import { getDashboard } from '../../api';
import {
  AppText,
  Badge,
  Card,
  IconCircle,
  OrderCard,
  Screen,
  SectionHeader,
  StatCard,
  StateView,
  Thumb,
} from '../../components';
import { FEATURES } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { formatCompact, formatRs, percent } from '../../utils/format';
import { totalStock } from '../../utils/products';
import { t } from '../../i18n';

export function DashboardScreen() {
  const navigation = useNavigation();
  const { seller } = useAuth();
  const shopId = seller?.shop?.id;
  const { data, error, reload, refresh, refreshing } = useLoad(
    () =>
      shopId && seller
        ? getDashboard(shopId, seller.id)
        : Promise.reject(new Error(t('No shop on this account.'))),
    [shopId, seller?.id],
  );

  const manyShops = (seller?.shops.length ?? 0) > 1;

  const header = (
    <View style={styles.header}>
      {/* With several shops, the name opens the shop switcher. */}
      <Pressable
        style={styles.flex}
        disabled={!manyShops}
        onPress={() => navigation.navigate('ChooseShop')}
        accessibilityRole={manyShops ? 'button' : undefined}
        accessibilityLabel={manyShops ? t('Switch shop') : undefined}
      >
        <AppText variant="caption" color={colors.textMuted}>
          Assalam o Alaikum,
        </AppText>
        <View style={styles.shopName}>
          <AppText variant="heading" numberOfLines={1} style={styles.shrink}>
            {seller?.shop?.name}
          </AppText>
          {manyShops ? <ChevronDown size={20} color={colors.text} /> : null}
        </View>
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate('Notifications')}
        style={styles.bell}
        hitSlop={8}
        accessibilityLabel={t('Notifications')}
      >
        <Bell size={22} color={colors.text} />
        {data?.unreadNotifications ? (
          <View style={styles.dot}>
            <AppText variant="small" color={colors.white}>
              {data.unreadNotifications}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );

  if (!data) {
    return (
      <Screen header={header} bottomInset={false} scroll={false}>
        <StateView error={error} onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      bottomInset={false}
      onRefresh={refresh}
      refreshing={refreshing}
    >
      {/* Today — the same teal doodle background as the Log in button. */}
      <ImageBackground
        source={ButtonBackground}
        resizeMode="cover"
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <AppText variant="label" color={colors.primaryTint}>
          {t("Today's sales")}
        </AppText>
        <AppText variant="title" color={colors.white} style={styles.heroValue}>
          {formatRs(data.todaySales)}
        </AppText>
        <View style={styles.heroRow}>
          <AppText color={colors.white}>
            {data.todayOrders} order{data.todayOrders === 1 ? '' : 's'} today
          </AppText>
          <Pressable
            onPress={() => navigation.navigate('Tabs', { screen: 'Orders' })}
            style={styles.heroButton}
          >
            <AppText variant="label" color={colors.primary}>
              {t('View orders')}
            </AppText>
            <ChevronForward size={16} color={colors.primary} />
          </Pressable>
        </View>
      </ImageBackground>


      {/* Quick actions */}
      <View style={styles.quick}>
        <QuickAction
          icon={PackagePlus}
          label={t('Add product')}
          onPress={() => navigation.navigate('ProductForm')}
        />
        <QuickAction
          icon={ImagePlus}
          label={t('Add post')}
          onPress={() => navigation.navigate('AddPost')}
        />
        <QuickAction
          icon={Megaphone}
          label={t('New ad')}
          onPress={() => navigation.navigate('CampaignForm')}
        />
      </View>

      <View style={styles.grid}>
        <StatCard
          icon={ClipboardList}
          tone="secondary"
          label={t('Pending orders')}
          value={String(data.pendingOrders)}
          onPress={() =>
            navigation.navigate('Tabs', {
              screen: 'Orders',
              params: { filter: 'pending' },
            })
          }
        />
        <StatCard
          icon={CircleCheck}
          tone="success"
          label={t('Completed orders')}
          value={String(data.completedOrders)}
          onPress={() =>
            navigation.navigate('Tabs', {
              screen: 'Orders',
              params: { filter: 'delivered' },
            })
          }
        />
        <StatCard
          icon={Truck}
          tone="info"
          label={t('Pending deliveries')}
          value={String(data.pendingDeliveries)}
          onPress={() =>
            navigation.navigate('Tabs', {
              screen: 'Orders',
              params: { filter: 'delivery' },
            })
          }
        />
        <StatCard
          icon={Wallet}
          tone="primary"
          label={t('Total earnings')}
          value={formatRs(data.totalEarnings)}
          onPress={() => navigation.navigate('Earnings')}
        />
      </View>

      {FEATURES.stock ? (
        <>
          <SectionHeader
            title={t('Low stock')}
            actionLabel={t('Inventory')}
            onAction={() => navigation.navigate('Inventory', { filter: 'low' })}
          />
          <Card padded={false}>
            {data.lowStock.length === 0 ? (
              <AppText color={colors.textMuted} style={styles.emptyLine}>
                {t('All products have enough stock.')}
              </AppText>
            ) : (
              data.lowStock.map((p, i) => {
                const stock = totalStock(p);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      navigation.navigate('ProductForm', { productId: p.id })
                    }
                    style={[styles.stockRow, i > 0 && styles.rowBorder]}
                  >
                    <Thumb uri={p.images[0]} size={40} />
                    <AppText style={styles.flex} numberOfLines={1}>
                      {p.title}
                    </AppText>
                    <Badge
                      label={stock === 0 ? t('Out of stock') : t('{count} left', { count: stock })}
                      tone={stock === 0 ? 'danger' : 'warning'}
                    />
                  </Pressable>
                );
              })
            )}
          </Card>
        </>
      ) : null}

      <SectionHeader
        title={t('Advertisement')}
        actionLabel={t('See all')}
        onAction={() => navigation.navigate('Ads')}
      />
      <Card onPress={() => navigation.navigate('Ads')}>
        <View style={styles.adHead}>
          <IconCircle icon={Megaphone} tone="purple" size={36} />
          <View style={styles.flex}>
            <AppText variant="bodyBold">
              {data.activeAds.length} active campaign
              {data.activeAds.length === 1 ? '' : 's'}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {formatRs(data.adTotals.spent)} spent ·{' '}
              {formatRs(data.adTotals.sales)} in sales
            </AppText>
          </View>
        </View>
        <View style={styles.adStats}>
          <AdStat
            label={t('Views')}
            value={formatCompact(data.adTotals.impressions)}
          />
          <AdStat label={t('Clicks')} value={formatCompact(data.adTotals.clicks)} />
          <AdStat
            label={t('Click rate')}
            value={percent(data.adTotals.clicks, data.adTotals.impressions)}
          />
          <AdStat label={t('Orders')} value={String(data.adTotals.orders)} />
        </View>
      </Card>

      <SectionHeader
        title={t('Recent orders')}
        actionLabel={t('See all')}
        onAction={() => navigation.navigate('Tabs', { screen: 'Orders' })}
      />
      <View style={styles.list}>
        {data.recentOrders.map(o => (
          <OrderCard key={o.id} order={o} />
        ))}
      </View>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: typeof PackagePlus;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}
    >
      <IconCircle icon={icon} size={44} />
      <AppText variant="label" align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

function AdStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.adStat}>
      <AppText variant="subheading">{value}</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  shopName: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroImage: { borderRadius: radius.lg },
  heroValue: { fontSize: 30, lineHeight: 36 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  quick: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  emptyLine: { padding: spacing.lg },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  adHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  adStats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  adStat: { flex: 1, alignItems: 'center', gap: 2 },
  list: { gap: spacing.md },
}));
