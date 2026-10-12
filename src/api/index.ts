// Orders, notifications and advertising use the shop's backend records.
// The older helpers below still use sample data until their backend chunk.
import {
  AppNotification,
  Dashboard,
  Earnings,
  EarningsPeriod,
  Order,
  OrderStatus,
  Post,
  Product,
  Rider,
  SellerSettings,
  TrackingStatus,
} from '../types/models';
import { isSameDay } from '../utils/format';
import {
  EARNING_STATUSES,
  IN_DELIVERY_STATUSES,
  PENDING_STATUSES,
  orderNet,
} from '../utils/orders';
import { stockState } from '../utils/products';
import * as db from './mockData';
import {
  getShopOrder,
  listShopOrders,
  moveShopShipment,
  setShopOrderStatus,
  setShopOrderTracking,
  shipShopOrder,
  StatusDetails,
} from './orders';
export type { StatusDetails } from './orders';
import { listCampaigns } from './campaigns';
export { listCampaigns, getCampaign, saveCampaign, setCampaignStatus } from './campaigns';
export type { CampaignInput } from './campaigns';
import {
  listSellerNotifications,
  markAllSellerNotificationsRead,
  markSellerNotificationRead,
  sellerUnreadCount,
} from './notifications';
import { t } from '../i18n';

const LATENCY_MS = 250;

function respond<T>(value: T): Promise<T> {
  return new Promise(resolve =>
    setTimeout(() => resolve(JSON.parse(JSON.stringify(value))), LATENCY_MS),
  );
}

function fail(message: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), LATENCY_MS),
  );
}

let nextId = 100;
const newId = (prefix: string) => `${prefix}${nextId++}`;

function findOrder(id: string): Order {
  const order = db.orders.find(o => o.id === id);
  if (!order) throw new Error('Order not found');
  return order;
}

function pushStatus(order: Order, status: OrderStatus) {
  order.status = status;
  order.history.push({ status, at: new Date().toISOString() });
}

// ---------- Dashboard ----------

export async function getDashboard(shopId: string, userId: string): Promise<Dashboard> {
  const [orders, unreadNotifications, campaigns] = await Promise.all([
    listShopOrders(shopId),
    sellerUnreadCount(userId).catch(() => 0),
    listCampaigns(shopId),
  ]);
  const today = new Date();
  const todays = orders.filter(o => isSameDay(new Date(o.createdAt), today));
  const earned = (o: Order) => EARNING_STATUSES.includes(o.status);
  const activeAds = campaigns.filter(c => c.status === 'active' && !c.isScheduled);
  const lowStock = db.products.filter(
    p => stockState(p, db.settings.lowStockThreshold) !== 'in_stock',
  );
  return respond({
    todayOrders: todays.length,
    // The same count as the Earnings page: today's delivered orders, net.
    todayEarnings: todays.filter(earned).reduce((s, o) => s + orderNet(o), 0),
    newOrders: orders.filter(o => o.status === 'new').length,
    pendingOrders: orders.filter(o => PENDING_STATUSES.includes(o.status)).length,
    completedOrders: orders.filter(o => o.status === 'delivered').length,
    pendingDeliveries: orders.filter(o => IN_DELIVERY_STATUSES.includes(o.status)).length,
    totalEarnings: orders.filter(earned).reduce((s, o) => s + orderNet(o), 0),
    lowStock,
    activeAds,
    adTotals: campaigns.reduce(
      (sum, c) => ({
        impressions: sum.impressions + c.impressions,
        clicks: sum.clicks + c.clicks,
        orders: sum.orders + c.orders,
        spent: sum.spent + c.spent,
        sales: sum.sales + c.sales,
      }),
      { impressions: 0, clicks: 0, orders: 0, spent: 0, sales: 0 },
    ),
    // Already newest first.
    recentOrders: orders.slice(0, 4),
    unreadNotifications,
  });
}

// Home's data, loaded behind the splash at start so Home
// opens with it. Home takes this request over instead of sending its own.
const PRELOAD_FRESH_MS = 30_000;
let preloadedDashboard: { key: string; at: number; promise: Promise<Dashboard> } | null = null;

/** Starts loading Home's data for this shop, ahead of Home opening. */
export function preloadDashboard(shopId: string, userId: string): Promise<Dashboard> {
  const promise = getDashboard(shopId, userId);
  preloadedDashboard = { key: `${shopId}:${userId}`, at: Date.now(), promise };
  // A failed preload isn't handed on: Home then loads for itself.
  promise.catch(() => {
    if (preloadedDashboard?.promise === promise) preloadedDashboard = null;
  });
  return promise;
}

/** Home's data loaded ahead, once (a later visit fetches afresh); null if none. */
export function takePreloadedDashboard(shopId: string, userId: string): Promise<Dashboard> | null {
  const hit = preloadedDashboard;
  if (!hit || hit.key !== `${shopId}:${userId}` || Date.now() - hit.at > PRELOAD_FRESH_MS) return null;
  preloadedDashboard = null;
  return hit.promise;
}

/** Settles once Home's preloaded data is in (or failed); at once if none is loading. */
export function whenDashboardPreloaded(): Promise<void> {
  return preloadedDashboard ? preloadedDashboard.promise.then(() => undefined, () => undefined) : Promise.resolve();
}

// ---------- Orders ----------

/** The shop's orders on Fazl, newest first. */
export function listOrders(shopId: string): Promise<Order[]> {
  return listShopOrders(shopId);
}

export function getOrder(shopId: string, id: string): Promise<Order> {
  return getShopOrder(shopId, id);
}

/** Moves a real order on one step (see orderActions); the customer is told on
 *  Fazl. A return carries its reason, a refund the amount paid back. */
export function updateOrderStatus(
  shopId: string,
  id: string,
  status: OrderStatus,
  details?: StatusDetails,
): Promise<Order> {
  return setShopOrderStatus(shopId, id, status, details);
}

/** A ready delivery order leaves the shop with the seller delivering it
 *  themselves: "Out for delivery" on Fazl, and the customer is told. */
export function startSelfDelivery(shopId: string, id: string): Promise<Order> {
  return setShopOrderStatus(shopId, id, 'out_for_delivery', { deliveryMethod: 'self' });
}

// Fazl riders aren't on Fazl yet: these still work on the sample orders only,
// and no real order offers them (see orderActions).

export async function listNearbyRiders(): Promise<Rider[]> {
  return respond(
    db.riders
      .filter(r => r.online)
      .sort((a, b) => Number(b.available) - Number(a.available) || a.distanceKm - b.distanceKm),
  );
}

export async function assignRider(orderId: string, riderId: string): Promise<Order> {
  const order = findOrder(orderId);
  const rider = db.riders.find(r => r.id === riderId);
  if (!rider) return fail('Rider not found');
  order.delivery = {
    ...order.delivery,
    method: 'rider',
    riderId: rider.id,
    riderName: rider.name,
    riderPhone: rider.phone,
    riderStatus: 'requested',
  };
  pushStatus(order, 'shipped');
  return respond(order);
}

/**
 * The courier and tracking ID of a ready order: it ships with them ("Shipped"
 * on Fazl). An order already sent (`editing`) just has them corrected. Either
 * way the customer sees them on Fazl.
 */
export function setTracking(
  shopId: string,
  orderId: string,
  courier: string,
  trackingId: string,
  editing: boolean,
): Promise<Order> {
  return editing
    ? setShopOrderTracking(shopId, orderId, courier, trackingId)
    : shipShopOrder(shopId, orderId, courier, trackingId);
}

/** An order sent by courier moves on as its tracking shows. */
export function updateTracking(
  shopId: string,
  orderId: string,
  trackingStatus: TrackingStatus,
): Promise<Order> {
  if (trackingStatus === 'shipped') return getShopOrder(shopId, orderId);
  return moveShopShipment(shopId, orderId, trackingStatus);
}

// ---------- Products & inventory ----------

export async function listProducts(): Promise<Product[]> {
  return respond(
    [...db.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function getProduct(id: string): Promise<Product> {
  const product = db.products.find(p => p.id === id);
  return product ? respond(product) : fail('Product not found');
}

export type ProductInput = Omit<Product, 'id' | 'sold' | 'views' | 'createdAt'>;

export async function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  if (id) {
    const product = db.products.find(p => p.id === id);
    if (!product) return fail('Product not found');
    Object.assign(product, input);
    if (input.salePrice == null) {
      delete product.salePrice;
      delete product.saleStart;
      delete product.saleEnd;
    }
    return respond(product);
  }
  const product: Product = {
    ...input,
    id: newId('p'),
    sold: 0,
    views: 0,
    createdAt: new Date().toISOString(),
  };
  db.products.unshift(product);
  return respond(product);
}

export async function deleteProduct(id: string): Promise<void> {
  const index = db.products.findIndex(p => p.id === id);
  if (index >= 0) db.products.splice(index, 1);
  return respond(undefined);
}

export async function setProductAvailable(id: string, available: boolean): Promise<Product> {
  const product = db.products.find(p => p.id === id);
  if (!product) return fail('Product not found');
  product.available = available;
  return respond(product);
}

/** Sets the stock of the product, or of one of its variants. */
export async function setStock(
  productId: string,
  stock: number,
  variantLabel?: string,
): Promise<Product> {
  const product = db.products.find(p => p.id === productId);
  if (!product) return fail('Product not found');
  const value = Math.max(0, Math.floor(stock));
  if (variantLabel) {
    const variant = product.variants.find(v => v.label === variantLabel);
    if (variant) variant.stock = value;
  } else {
    product.stock = value;
  }
  return respond(product);
}

// ---------- Posts ----------

export async function listPosts(): Promise<Post[]> {
  return respond(db.posts);
}

export type PostInput = Omit<Post, 'id' | 'createdAt' | 'views' | 'likes'>;

export async function createPost(input: PostInput): Promise<Post> {
  const post: Post = {
    ...input,
    id: newId('po'),
    createdAt: new Date().toISOString(),
    views: 0,
    likes: 0,
  };
  db.posts.unshift(post);
  return respond(post);
}

export async function deletePost(id: string): Promise<void> {
  const index = db.posts.findIndex(p => p.id === id);
  if (index >= 0) db.posts.splice(index, 1);
  return respond(undefined);
}

// ---------- Earnings ----------

const DAY_NAMES = [t('Sun'), t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat')];
const MONTH_NAMES = [t('Jan'), t('Feb'), t('Mar'), t('Apr'), t('May'), t('Jun'), t('Jul'), t('Aug'), t('Sep'), t('Oct'), t('Nov'), t('Dec')];

export async function getEarnings(shopId: string, period: EarningsPeriod): Promise<Earnings> {
  // Orders that count as sales: delivered, and later returned/refunded.
  const counted = (await listShopOrders(shopId)).filter(o =>
    EARNING_STATUSES.includes(o.status),
  );
  const now = new Date();
  const buckets: { label: string; from: Date; to: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    if (period === 'daily') {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const to = new Date(from.getTime() + 86_400_000);
      buckets.push({ label: DAY_NAMES[from.getDay()], from, to });
    } else if (period === 'weekly') {
      const to = new Date(now.getTime() - i * 7 * 86_400_000 + 86_400_000);
      const from = new Date(to.getTime() - 7 * 86_400_000);
      buckets.push({ label: i === 0 ? t('This wk') : t('{count}w ago', { count: i }), from, to });
    } else {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({ label: MONTH_NAMES[from.getMonth()], from, to });
    }
  }
  const inRange = (o: Order) => {
    const at = new Date(o.createdAt);
    return at >= buckets[0].from && at < buckets[buckets.length - 1].to;
  };
  const records = counted
    .filter(inRange)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sum = (f: (o: Order) => number) => records.reduce((s, o) => s + f(o), 0);
  return {
    totals: {
      orders: records.length,
      sales: sum(o => o.subtotal),
      deliveryCharges: sum(o => o.deliveryCharge),
      fazlCharges: sum(o => o.fazlCharge),
      discounts: sum(o => o.discount),
      refunds: sum(o => o.refund),
      net: sum(orderNet),
    },
    series: buckets.map(b => ({
      label: b.label,
      value: records
        .filter(o => {
          const at = new Date(o.createdAt);
          return at >= b.from && at < b.to;
        })
        .reduce((s, o) => s + o.subtotal, 0),
    })),
    records,
  };
}

// ---------- Profile, notifications, settings ----------

/** The seller's notifications on Fazl (./notifications.ts). */
export function listNotifications(userId: string, shopId: string): Promise<AppNotification[]> {
  return listSellerNotifications(userId, shopId);
}

export function markAllNotificationsRead(userId: string): Promise<void> {
  return markAllSellerNotificationsRead(userId);
}

export function markNotificationRead(id: string): Promise<void> {
  return markSellerNotificationRead(id);
}

export async function getSettings(): Promise<SellerSettings> {
  return respond(db.settings);
}

export async function saveSettings(next: SellerSettings): Promise<SellerSettings> {
  Object.assign(db.settings, next);
  return respond(db.settings);
}
