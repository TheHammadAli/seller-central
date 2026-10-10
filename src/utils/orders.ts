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
 *  "Shipped" (and "Collected" once done); a sample local order handed to a
 *  rider is "Assigned". */
export function statusLabel(order: Order, status = order.status): string {
  if (order.fulfilment === 'pickup') {
    if (status === 'shipped') return t('Ready for pickup');
    if (status === 'delivered') return t('Collected');
  }
  if (status === 'shipped' && !order.fulfilment && order.delivery.type === 'local') {
    return t('Assigned');
  }
  return STATUS_LABELS[status];
}

/** The steps this order goes through, for its progress line: Fazl's own
 *  (see src/api/orders.ts). */
export function orderSteps(_order: Order): OrderStatus[] {
  return ['new', 'accepted', 'shipped', 'delivered'];
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

export type OrderAction =
  | { kind: 'status'; label: string; next: OrderStatus; tone: 'primary' | 'danger' | 'outline' }
  | { kind: 'selfDelivery'; label: string }
  | { kind: 'assignRider'; label: string }
  | { kind: 'addTracking'; label: string }
  | { kind: 'tracking'; label: string; next: TrackingStatus };

/**
 * The buttons an order shows, first one being the main next step. Only the
 * steps Fazl has (src/api/orders.ts): accept or reject a new order, ship or
 * cancel an accepted one, then mark it delivered. The rider, courier and
 * returns steps below wait for those to be on Fazl.
 */
export function orderActions(o: Order): OrderAction[] {
  if (o.fulfilment) {
    switch (o.status) {
      case 'new':
        return [
          { kind: 'status', label: t('Accept order'), next: 'accepted', tone: 'primary' },
          { kind: 'status', label: t('Reject'), next: 'cancelled', tone: 'danger' },
        ];
      case 'accepted':
        return [
          {
            kind: 'status',
            label: o.fulfilment === 'pickup' ? t('Ready for pickup') : t('Mark as shipped'),
            next: 'shipped',
            tone: 'primary',
          },
          { kind: 'status', label: t('Cancel order'), next: 'cancelled', tone: 'danger' },
        ];
      case 'shipped':
        return [
          {
            kind: 'status',
            label: o.fulfilment === 'pickup' ? t('Mark as collected') : t('Mark delivered'),
            next: 'delivered',
            tone: 'primary',
          },
        ];
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
