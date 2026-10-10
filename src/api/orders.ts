// The shop's real orders on Fazl, as Seller Central shows them. An order on
// Fazl is one product (a cart becomes one order per product) and moves
// pending → confirmed → shipped → delivered, or cancelled before it ships;
// the app's own wording for those steps is New → Accepted → Shipped →
// Delivered / Cancelled. Riders, couriers, returns and refunds aren't on Fazl
// yet, so a real order never reaches those steps.
import { Order, OrderStatus } from '../types/models';
import { api } from './http';
import { LocalizedName, nameOf } from './session';
import { t } from '../i18n';

type BackendStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

interface BackendOrder {
  id: string;
  /** The order's ID people see: ORD-000123 (older backends: none). */
  orderCode?: string | null;
  status: BackendStatus;
  createdAt: string;
  updatedAt: string;
  amount: number;
  quantity: number;
  variant?: Record<string, unknown> | null;
  deliveryOption: 'delivery' | 'self-pickup';
  /** Where to deliver it, as the buyer confirmed at checkout (older orders: none). */
  deliveryAddress?: string | null;
  paymentType: 'cashonDelivery' | 'Easypaisa';
  productId: string;
  product?: { id: string; title: LocalizedName; images?: string[] | null } | null;
  buyer?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
}

const FROM_BACKEND: Record<BackendStatus, OrderStatus> = {
  pending: 'new',
  confirmed: 'accepted',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const TO_BACKEND: Partial<Record<OrderStatus, BackendStatus>> = {
  accepted: 'confirmed',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

/** A listing photo's small card version, when it has one (photos since WebP). */
const cardImage = (url?: string) => url?.replace(/__full\.webp$/, '__card.webp');

function toOrder(o: BackendOrder): Order {
  const status = FROM_BACKEND[o.status] ?? 'new';
  const qty = Math.max(1, o.quantity || 1);
  const variant = Object.values(o.variant ?? {})
    .map(v => String(v ?? '').trim())
    .filter(Boolean)
    .join(' / ');
  return {
    id: o.id,
    number: o.orderCode || `#${o.id.slice(-6).toUpperCase()}`,
    createdAt: o.createdAt,
    status,
    customer: {
      name: o.buyer?.name?.trim() || o.buyer?.email || t('Customer'),
      phone: o.buyer?.phone ?? '',
      // The address the buyer gave for this order; their profile's for an older one.
      address: o.deliveryAddress?.trim() || o.buyer?.address || '',
      area: '',
      city: '',
    },
    items: [
      {
        productId: o.productId,
        title: nameOf(o.product?.title) || t('Product'),
        image: cardImage(o.product?.images?.[0] ?? undefined),
        ...(variant ? { variant } : {}),
        qty,
        unitPrice: Math.round((o.amount || 0) / qty),
      },
    ],
    payment: o.paymentType === 'Easypaisa' ? 'easypaisa' : 'cod',
    // What the customer pays, as the order says; Fazl charges and delivery
    // fees aren't split out on Fazl yet.
    subtotal: o.amount || 0,
    deliveryCharge: 0,
    discount: 0,
    fazlCharge: 0,
    refund: 0,
    delivery: { type: 'local' },
    fulfilment: o.deliveryOption === 'self-pickup' ? 'pickup' : 'delivery',
    // Fazl keeps when an order was placed and when it last changed.
    history: [
      { status: 'new', at: o.createdAt },
      ...(status !== 'new' ? [{ status, at: o.updatedAt }] : []),
    ],
  };
}

const PAGE = 100;
const MAX_PAGES = 10;

/** Every order of the shop, newest first (up to 1,000). */
export async function listShopOrders(shopId: string): Promise<Order[]> {
  const all: BackendOrder[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await api<BackendOrder[]>(
      `/orders/shop/${shopId}/manage?page=${page}&limit=${PAGE}`,
    );
    all.push(...(batch ?? []));
    if (!batch || batch.length < PAGE) break;
  }
  return all.map(toOrder);
}

export async function getShopOrder(shopId: string, orderId: string): Promise<Order> {
  const order = (await listShopOrders(shopId)).find(o => o.id === orderId);
  if (!order) throw new Error(t('This order is no longer in your shop.'));
  return order;
}

/** Moves the order on one step; the customer sees it on Fazl right away. */
export async function setShopOrderStatus(
  shopId: string,
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  const next = TO_BACKEND[status];
  if (!next) throw new Error(t('Something went wrong'));
  const order = await api<BackendOrder>(`/orders/shop/${shopId}/manage/${orderId}`, {
    method: 'PATCH',
    body: { status: next },
  });
  return toOrder(order);
}
