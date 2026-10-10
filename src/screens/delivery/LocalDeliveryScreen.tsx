import { Bike, PackageCheck, Star } from 'lucide-react-native';
import { ChevronForward } from '../../components/Chevrons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getSettings, listNearbyRiders, listOrders, saveSettings } from '../../api';
import {
  AppText,
  Badge,
  Card,
  Header,
  IconCircle,
  Screen,
  SectionHeader,
  Segmented,
  StateView,
} from '../../components';
import { useLoad } from '../../hooks/useLoad';
import { RootScreenProps } from '../../navigation/types';
import { colors, spacing, themedStyles } from '../../theme';
import { LocalMethod, Order } from '../../types/models';
import { timeAgo } from '../../utils/format';
import { RIDER_STEPS } from '../../utils/orders';
import { t } from '../../i18n';
import { useAuth } from '../../state/AuthContext';

/** Local orders: deliver them yourself or hand them to a nearby Fazl rider. */
export function LocalDeliveryScreen({ navigation }: RootScreenProps<'LocalDelivery'>) {
  const shopId = useAuth().seller?.shop?.id;
  const { data, setData, error, reload, refresh, refreshing } = useLoad(async () => {
    const [orders, riders, settings] = await Promise.all([
      shopId ? listOrders(shopId) : Promise.resolve([]),
      listNearbyRiders(),
      getSettings(),
    ]);
    // Riders aren't on Fazl yet: only sample orders are delivered this way.
    return { orders: orders.filter(o => !o.fulfilment && o.delivery.type === 'local'), riders, settings };
  });

  if (!data) {
    return (
      <Screen header={<Header title={t('Local Delivery')} />} scroll={false}>
        <StateView error={error} onRetry={reload} />
      </Screen>
    );
  }

  const setDefault = async (method: LocalMethod) => {
    const settings = { ...data.settings, defaultLocalDelivery: method };
    setData({ ...data, settings });
    await saveSettings(settings);
  };

  const ready = data.orders.filter(o => o.status === 'ready');
  const onTheWay = data.orders.filter(o => o.status === 'shipped' || o.status === 'out_for_delivery');
  const available = data.riders.filter(r => r.available);

  return (
    <Screen header={<Header title={t('Local Delivery')} />} onRefresh={refresh} refreshing={refreshing}>
      <Card style={styles.intro}>
        <AppText variant="subheading">{t('No rider of your own? No problem.')}</AppText>
        <AppText color={colors.textMuted}>
          {t('For each local order, deliver it yourself or send it with a nearby Fazl rider. You choose when the order is ready.')}
        </AppText>
        <AppText variant="label" style={styles.defaultLabel}>
          {t('Suggest first')}
        </AppText>
        <Segmented
          options={[
            { key: 'rider', label: t('Fazl rider') },
            { key: 'self', label: t('Self delivery') },
          ]}
          value={data.settings.defaultLocalDelivery}
          onChange={setDefault}
        />
      </Card>

      <SectionHeader title={t('Riders near your shop')} />
      <Card>
        <View style={styles.ridersHead}>
          <IconCircle icon={Bike} />
          <View style={styles.flex}>
            <AppText variant="subheading">
              {available.length} available rider{available.length === 1 ? '' : 's'} nearby
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {data.riders.length} online right now
            </AppText>
          </View>
        </View>
        {data.riders.slice(0, 4).map(r => (
          <View key={r.id} style={styles.riderRow}>
            <AppText style={styles.flex} numberOfLines={1}>
              {r.name}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {r.distanceKm} km
            </AppText>
            <View style={styles.rating}>
              <Star size={12} color={colors.primary} fill={colors.primary} />
              <AppText variant="caption">{r.rating.toFixed(1)}</AppText>
            </View>
            <Badge label={r.available ? t('Free') : t('Busy')} tone={r.available ? 'success' : 'neutral'} />
          </View>
        ))}
      </Card>

      <SectionHeader title={t('Ready to send ({count})', { count: ready.length })} />
      {ready.length ? (
        <View style={styles.list}>
          {ready.map(o => (
            <DeliveryRow key={o.id} order={o} onPress={() => navigation.navigate('OrderDetail', { orderId: o.id })} />
          ))}
        </View>
      ) : (
        <AppText color={colors.textMuted}>{t('No local orders are waiting to be sent.')}</AppText>
      )}

      <SectionHeader title={t('On the way ({count})', { count: onTheWay.length })} />
      {onTheWay.length ? (
        <View style={styles.list}>
          {onTheWay.map(o => (
            <DeliveryRow key={o.id} order={o} onPress={() => navigation.navigate('OrderDetail', { orderId: o.id })} />
          ))}
        </View>
      ) : (
        <AppText color={colors.textMuted}>{t('Nothing on the way right now.')}</AppText>
      )}
    </Screen>
  );
}

function DeliveryRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const d = order.delivery;
  const riderStep = RIDER_STEPS.find(s => s.status === d.riderStatus);
  const line =
    order.status === 'ready'
      ? `${order.customer.area} · ${t('ready {time}', { time: timeAgo(order.history[order.history.length - 1].at) })}`
      : d.method === 'self'
      ? t('You are delivering')
      : `${d.riderName} · ${riderStep?.label ?? ''}`;
  return (
    <Card onPress={onPress} style={styles.row}>
      <IconCircle icon={order.status === 'ready' ? PackageCheck : Bike} tone={order.status === 'ready' ? 'primary' : 'info'} size={38} />
      <View style={styles.flex}>
        <AppText variant="bodyBold">
          {order.number} · {order.customer.name}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {line}
        </AppText>
      </View>
      <ChevronForward size={20} color={colors.textSubtle} />
    </Card>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  intro: { gap: spacing.sm },
  defaultLabel: { marginTop: spacing.sm },
  ridersHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
}));
