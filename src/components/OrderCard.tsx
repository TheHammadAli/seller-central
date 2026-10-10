import { useNavigation } from '@react-navigation/native';
import { Bike, MapPin, Store, Truck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, themedStyles } from '../theme';
import { Order } from '../types/models';
import { formatRs, timeAgo } from '../utils/format';
import { orderItemCount, statusLabel, STATUS_TONES } from '../utils/orders';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { Card } from './Card';
import { Thumb } from './Thumb';
import { t } from '../i18n';

export function OrderCard({ order }: { order: Order }) {
  const navigation = useNavigation();
  const first = order.items[0];
  const more = order.items.length - 1;
  const local = order.delivery.type === 'local';
  // A real order says how the customer gets it; a sample one, local or not.
  const DeliveryIcon = order.fulfilment === 'pickup' ? Store : order.fulfilment || !local ? Truck : Bike;
  const deliveryLabel = order.fulfilment
    ? order.fulfilment === 'pickup'
      ? t('Pickup')
      : t('Delivery')
    : local
    ? t('Local')
    : t('Nationwide');

  return (
    <Card
      onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
      style={styles.card}
    >
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="bodyBold">{order.number}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {timeAgo(order.createdAt)} · {order.customer.name}
          </AppText>
        </View>
        <Badge label={statusLabel(order)} tone={STATUS_TONES[order.status]} />
      </View>

      <View style={styles.item}>
        <Thumb uri={first.image} size={48} />
        <View style={styles.flex}>
          <AppText numberOfLines={1}>{first.title}</AppText>
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {[first.variant, t('Qty {qty}', { qty: first.qty }), more > 0 ? t(more > 1 ? '+{count} more items' : '+{count} more item', { count: more }) : null]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.delivery}>
          <DeliveryIcon size={14} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted}>
            {deliveryLabel}
          </AppText>
          {order.customer.city ? (
            <>
              <MapPin size={14} color={colors.textMuted} />
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                {order.customer.city}
              </AppText>
            </>
          ) : null}
        </View>
        <AppText variant="bodyBold" color={colors.price}>
          {formatRs(order.subtotal)}
          <AppText variant="caption" color={colors.textMuted}>
            {'  ' + t(orderItemCount(order) > 1 ? '{count} items' : '{count} item', { count: orderItemCount(order) })}
          </AppText>
        </AppText>
      </View>
    </Card>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  card: { gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
}));
