import { Tone } from '../theme';
import {
  Order,
  OrderStatus,
  RiderStatus,
  TrackingStatus,
} from '../types/models';
import { t } from '../i18n';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: t('New'),
  accepted: t('Accepted'),
  preparing: t('Preparing'),
  ready: t('Ready'),
  shipped: t('Shipped'),
  out_for_delivery: t('Out for delivery'),
  delivered: t('Delivered'),
  cancelled: t('Cancelled'),
  returned: t('Returned'),
  refunded: t('Refunded'),
};

export const STATUS_TONES: Record<OrderStatus, Tone> = {
  new: 'secondary',
  accepted: 'info',
  preparing: 'purple',
  ready: 'primary',
  shipped: 'info',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'neutral',
  refunded: 'neutral',
};

/** A real order collected from the shop is "Ready for pickup" rather than
 *  "Ready" (or "Shipped", the older way) and "Collected" once done; a sample
 *  local order handed to a rider is "Assigned". */
export function statusLabel(order: Order, status = order.status): string {
  if (order.fulfilment === 'pickup') {
    if (status === 'ready' || status === 'shipped') return t('Ready for pickup');
    if (status === 'delivered') return t('Collected');
  }
  if (status === 'shipped' && !order.fulfilment && order.delivery.type === 'local') {
    return t('Assigned');
  }
  return STATUS_LABELS[status];
}

/** The steps this order goes through, for its progress line: Fazl's own
 *  (see src/api/orders.ts). A pickup order is collected once ready; one sent
 *  by courier is shipped first (its tracking shows the courier's steps); one
 *  shipped the older way keeps its shorter steps. */
export function orderSteps(order: Order): OrderStatus[] {
  if (order.delivery.type === 'nationwide') {
    return ['new', 'accepted', 'preparing', 'ready', 'shipped', 'out_for_delivery', 'delivered'];
  }
  if (order.status === 'shipped') return ['new', 'accepted', 'shipped', 'delivered'];
  return order.fulfilment === 'pickup'
    ? ['new', 'accepted', 'preparing', 'ready', 'delivered']
    : ['new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
}

export const RIDER_STEPS: { status: RiderStatus; label: string }[] = [
  { status: 'requested', label: t('Request sent') },
  { status: 'accepted', label: t('Accepted') },
  { status: 'picked_up', label: t('Picked up') },
  { status: 'on_the_way', label: t('On the way') },
  { status: 'delivered', label: t('Delivered') },
];

export const TRACKING_STEPS: { status: TrackingStatus; label: string }[] = [
  { status: 'shipped', label: t('Shipped') },
  { status: 'in_transit', label: t('In transit') },
  { status: 'out_for_delivery', label: t('Out for delivery') },
  { status: 'delivered', label: t('Delivered') },
];

export const COURIERS = [
  'TCS',
  'Leopards',
  'M&P',
  'Trax',
  'PostEx',
  'Call Courier',
  'BlueEx',
  'Other',
];

/** What the seller keeps from an order. */
export function orderNet(o: Order): number {
  return o.subtotal + o.deliveryCharge - o.discount - o.fazlCharge - o.refund;
}

export function orderItemCount(o: Order): number {
  return o.items.reduce((sum, i) => sum + i.qty, 0);
}

/** Waiting on the seller: not yet handed to a rider or courier. */
export const PENDING_STATUSES: OrderStatus[] = [
  'new',
  'accepted',
  'preparing',
  'ready',
];

/** On its way to the customer. */
export const IN_DELIVERY_STATUSES: OrderStatus[] = [
  'shipped',
  'out_for_delivery',
];

/**
 * Orders that count towards earnings: delivered, and later returned/refunded
 * (a refund comes off through orderNet). Home and Earnings both use this, so
 * their figures agree.
 */
export const EARNING_STATUSES: OrderStatus[] = [
  'delivered',
  'returned',
  'refunded',
];

export type OrderAction =
  | { kind: 'status'; label: string; next: OrderStatus; tone: 'primary' | 'danger' | 'outline' }
  | { kind: 'selfDelivery'; label: string }
  | { kind: 'assignRider'; label: string }
  | { kind: 'addTracking'; label: string }
  | { kind: 'tracking'; label: string; next: TrackingStatus };

/**
 * The buttons an order shows, first one being the main next step. Only the
 * steps Fazl has (src/api/orders.ts): accept or reject a new order, prepare
 * it and mark it ready (or cancel it until then); a ready delivery order goes
 * out with the seller delivering it or is sent with a courier (then follows
 * its tracking), a ready pickup order is collected; then it's delivered, and
 * if the customer sends it back, returned and refunded. The rider steps
 * below wait for riders to be on Fazl.
 */
export function orderActions(o: Order): OrderAction[] {
  if (o.fulfilment) {
    const pickup = o.fulfilment === 'pickup';
    switch (o.status) {
      case 'new':
        return [
          { kind: 'status', label: t('Accept order'), next: 'accepted', tone: 'primary' },
          { kind: 'status', label: t('Reject'), next: 'cancelled', tone: 'danger' },
        ];
      case 'accepted':
        return [
          { kind: 'status', label: t('Start preparing'), next: 'preparing', tone: 'primary' },
          { kind: 'status', label: t('Cancel order'), next: 'cancelled', tone: 'danger' },
        ];
      case 'preparing':
        return [
          {
            kind: 'status',
            label: pickup ? t('Ready for pickup') : t('Mark as ready'),
            next: 'ready',
            tone: 'primary',
          },
          { kind: 'status', label: t('Cancel order'), next: 'cancelled', tone: 'danger' },
        ];
      case 'ready':
        return pickup
          ? [{ kind: 'status', label: t('Mark as collected'), next: 'delivered', tone: 'primary' }]
          : [
              { kind: 'selfDelivery', label: t('Deliver it myself') },
              { kind: 'addTracking', label: t('Send with a courier') },
            ];
      // Sent by courier: it moves on as its tracking shows.
      case 'shipped':
      case 'out_for_delivery':
        if (o.delivery.type === 'nationwide') {
          if (o.status === 'out_for_delivery') {
            return [{ kind: 'tracking', label: t('Mark delivered'), next: 'delivered' }];
          }
          return o.delivery.trackingStatus === 'in_transit'
            ? [{ kind: 'tracking', label: t('Mark out for delivery'), next: 'out_for_delivery' }]
            : [{ kind: 'tracking', label: t('Mark in transit'), next: 'in_transit' }];
        }
        // Out with the seller, or shipped the older way.
        return [
          {
            kind: 'status',
            label: pickup ? t('Mark as collected') : t('Mark delivered'),
            next: 'delivered',
            tone: 'primary',
          },
        ];
      case 'delivered':
        return [{ kind: 'status', label: t('Mark as returned'), next: 'returned', tone: 'outline' }];
      case 'returned':
        return [{ kind: 'status', label: t('Refund customer'), next: 'refunded', tone: 'primary' }];
      default:
        return [];
    }
  }
  const local = o.delivery.type === 'local';
  switch (o.status) {
    case 'new':
      return [
        { kind: 'status', label: t('Accept order'), next: 'accepted', tone: 'primary' },
        { kind: 'status', label: t('Reject'), next: 'cancelled', tone: 'danger' },
      ];
    case 'accepted':
      return [
        { kind: 'status', label: t('Start preparing'), next: 'preparing', tone: 'primary' },
        { kind: 'status', label: t('Cancel order'), next: 'cancelled', tone: 'danger' },
      ];
    case 'preparing':
      return [{ kind: 'status', label: t('Mark as ready'), next: 'ready', tone: 'primary' }];
    case 'ready':
      return local
        ? [
            { kind: 'assignRider', label: t('Find a Fazl rider') },
            { kind: 'selfDelivery', label: t('Deliver it myself') },
          ]
        : [{ kind: 'addTracking', label: t('Add courier & tracking ID') }];
    case 'shipped':
      if (local) return []; // the rider moves it on from here
      return o.delivery.trackingStatus === 'in_transit'
        ? [{ kind: 'tracking', label: t('Mark out for delivery'), next: 'out_for_delivery' }]
        : [{ kind: 'tracking', label: t('Mark in transit'), next: 'in_transit' }];
    case 'out_for_delivery':
      if (local && o.delivery.method === 'rider') return [];
      return local
        ? [{ kind: 'status', label: t('Mark delivered'), next: 'delivered', tone: 'primary' }]
        : [{ kind: 'tracking', label: t('Mark delivered'), next: 'delivered' }];
    case 'delivered':
      return [{ kind: 'status', label: t('Mark as returned'), next: 'returned', tone: 'outline' }];
    case 'returned':
      return [{ kind: 'status', label: t('Refund customer'), next: 'refunded', tone: 'primary' }];
    default:
      return [];
  }
}
