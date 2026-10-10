// Sample data for building the screens before the backend exists. Dates are
// relative to when the app starts, so "today" always has orders.
import {
  AppNotification,
  Order,
  OrderItem,
  OrderStatus,
  Post,
  Product,
  Rider,
  SellerSettings,
} from '../types/models';

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const ahead = (ms: number) => new Date(NOW + ms).toISOString();

export const products: Product[] = [
  {
    id: 'p1',
    title: "Men's Cotton Kurta",
    description: 'Soft breathable cotton kurta for daily and festive wear.',
    category: 'Men Clothing',
    images: [],
    price: 2800,
    salePrice: 2200,
    saleStart: ago(2 * DAY),
    saleEnd: ahead(5 * DAY),
    options: [
      { name: 'Size', values: ['M', 'L', 'XL'] },
      { name: 'Color', values: ['White', 'Black'] },
    ],
    variants: [
      { label: 'M / White', stock: 6 },
      { label: 'M / Black', stock: 4 },
      { label: 'L / White', stock: 2 },
      { label: 'L / Black', stock: 0 },
      { label: 'XL / White', stock: 3 },
      { label: 'XL / Black', stock: 1, price: 2900 },
    ],
    stock: 0,
    available: true,
    sold: 48,
    views: 1320,
    createdAt: ago(40 * DAY),
  },
  {
    id: 'p2',
    title: 'Lawn 3-Piece Suit (Unstitched)',
    description: 'Printed lawn shirt, dupatta and trouser. 3 metre shirt.',
    category: 'Women Clothing',
    images: [],
    price: 4500,
    options: [],
    variants: [],
    stock: 3,
    available: true,
    sold: 31,
    views: 980,
    createdAt: ago(25 * DAY),
  },
  {
    id: 'p3',
    title: 'Peshawari Chappal',
    description: 'Hand-made leather chappal with rubber sole.',
    category: 'Footwear',
    images: [],
    price: 3500,
    salePrice: 2999,
    saleStart: ahead(3 * DAY),
    saleEnd: ahead(10 * DAY),
    options: [{ name: 'Size', values: ['8', '9', '10'] }],
    variants: [
      { label: '8', stock: 5 },
      { label: '9', stock: 7 },
      { label: '10', stock: 4 },
    ],
    stock: 0,
    available: true,
    sold: 22,
    views: 640,
    createdAt: ago(18 * DAY),
  },
  {
    id: 'p4',
    title: 'Wireless Earbuds Pro',
    description: 'Bluetooth 5.3, 30 hours battery with case, touch controls.',
    category: 'Electronics',
    images: [],
    price: 5200,
    options: [],
    variants: [],
    stock: 0,
    available: true,
    sold: 57,
    views: 2210,
    createdAt: ago(60 * DAY),
  },
  {
    id: 'p5',
    title: 'Ceramic Dinner Set (32 pcs)',
    description: 'Microwave-safe ceramic dinner set for 6 people.',
    category: 'Home & Kitchen',
    images: [],
    price: 9800,
    salePrice: 8500,
    saleStart: ago(20 * DAY),
    saleEnd: ago(6 * DAY),
    options: [],
    variants: [],
    stock: 9,
    available: true,
    sold: 12,
    views: 410,
    createdAt: ago(35 * DAY),
  },
  {
    id: 'p6',
    title: 'Kids School Bag',
    description: 'Waterproof school bag with 3 compartments.',
    category: 'Kids',
    images: [],
    price: 1800,
    options: [{ name: 'Color', values: ['Blue', 'Pink'] }],
    variants: [
      { label: 'Blue', stock: 12 },
      { label: 'Pink', stock: 8 },
    ],
    stock: 0,
    available: true,
    sold: 64,
    views: 1105,
    createdAt: ago(50 * DAY),
  },
  {
    id: 'p7',
    title: 'Pure Sidr Honey 1kg',
    description: 'Natural sidr honey, lab tested.',
    category: 'Grocery',
    images: [],
    price: 3200,
    options: [],
    variants: [],
    stock: 25,
    available: true,
    sold: 39,
    views: 760,
    createdAt: ago(12 * DAY),
  },
  {
    id: 'p8',
    title: 'Steel Water Bottle 1L',
    description: 'Keeps drinks cold for 24 hours and hot for 12.',
    category: 'Home & Kitchen',
    images: [],
    price: 1500,
    options: [],
    variants: [],
    stock: 4,
    available: false,
    sold: 18,
    views: 330,
    createdAt: ago(8 * DAY),
  },
];

const item = (p: Product, qty: number, variant?: string): OrderItem => ({
  productId: p.id,
  title: p.title,
  variant,
  qty,
  unitPrice: p.salePrice ?? p.price,
});

const customers = [
  { name: 'Ayesha Malik', phone: '0312 5550123', address: 'House 21, Street 7', area: 'Bahria Town Phase 4', city: 'Rawalpindi' },
  { name: 'Usman Tariq', phone: '0333 5550456', address: 'Flat 3B, Gulberg Heights', area: 'Gulberg', city: 'Lahore' },
  { name: 'Sana Javed', phone: '0301 5550789', address: 'House 5, Lane 2', area: 'Satellite Town', city: 'Rawalpindi' },
  { name: 'Hassan Ali', phone: '0345 5550321', address: 'House 88, Block C', area: 'PECHS', city: 'Karachi' },
  { name: 'Mariam Noor', phone: '0321 5550654', address: 'House 12, Street 40', area: 'G-11/2', city: 'Islamabad' },
  { name: 'Bilal Sheikh', phone: '0300 5550987', address: 'Shop 4, Main Bazar', area: 'Wah Cantt', city: 'Wah' },
  { name: 'Fatima Zahra', phone: '0315 5550111', address: 'House 9, Street 3', area: 'Chaklala Scheme 3', city: 'Rawalpindi' },
  { name: 'Ali Hamza', phone: '0302 5550222', address: 'House 44, Block D', area: 'Hayatabad', city: 'Peshawar' },
];

// Each step a little after the last, the newest still in the past.
const history = (statuses: OrderStatus[], startMs: number) => {
  const step = Math.min(2 * HOUR, startMs / statuses.length);
  return statuses.map((status, i) => ({ status, at: ago(startMs - i * step) }));
};

const [kurta, lawn, chappal, earbuds, dinner, bag, honey, bottle] = products;

function order(
  n: number,
  hoursAgo: number,
  statuses: OrderStatus[],
  customer: number,
  items: OrderItem[],
  delivery: Order['delivery'],
  extra: Partial<Order> = {},
): Order {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  return {
    id: `o${n}`,
    number: `FZ-${(10230 + n).toString()}`,
    createdAt: ago(hoursAgo * HOUR),
    status: statuses[statuses.length - 1],
    customer: customers[customer],
    items,
    payment: n % 3 === 0 ? 'easypaisa' : 'cod',
    subtotal,
    deliveryCharge: delivery.type === 'local' ? 150 : 250,
    discount: 0,
    fazlCharge: Math.round(subtotal * 0.05),
    refund: 0,
    delivery,
    history: history(statuses, hoursAgo * HOUR),
    ...extra,
  };
}

export const orders: Order[] = [
  order(1, 0.3, ['new'], 0, [item(kurta, 1, 'L / White')], { type: 'local' }),
  order(2, 1.2, ['new'], 1, [item(earbuds, 1)], { type: 'nationwide' }, { note: 'Please pack carefully.' }),
  order(3, 2.5, ['new', 'accepted'], 2, [item(bag, 2, 'Blue')], { type: 'local' }),
  order(4, 4, ['new', 'accepted', 'preparing'], 3, [item(lawn, 1), item(honey, 1)], { type: 'nationwide' }),
  order(5, 5, ['new', 'accepted', 'preparing', 'ready'], 4, [item(chappal, 1, '9')], { type: 'local' }),
  order(6, 6, ['new', 'accepted', 'preparing', 'ready'], 7, [item(dinner, 1)], { type: 'nationwide' }),
  order(
    7,
    9,
    ['new', 'accepted', 'preparing', 'ready', 'shipped'],
    5,
    [item(honey, 2)],
    { type: 'local', method: 'rider', riderId: 'r1', riderName: 'Bilal Ahmed', riderPhone: '0311 5551001', riderStatus: 'accepted' },
  ),
  order(
    8,
    20,
    ['new', 'accepted', 'preparing', 'ready', 'shipped'],
    1,
    [item(kurta, 2, 'M / Black')],
    { type: 'nationwide', courier: 'TCS', trackingId: '7723918845', trackingStatus: 'in_transit' },
  ),
  order(
    9,
    26,
    ['new', 'accepted', 'preparing', 'ready', 'out_for_delivery'],
    6,
    [item(bag, 1, 'Pink')],
    { type: 'local', method: 'self' },
  ),
  order(
    10,
    30,
    ['new', 'accepted', 'preparing', 'ready', 'shipped', 'out_for_delivery'],
    2,
    [item(bottle, 2)],
    { type: 'local', method: 'rider', riderId: 'r2', riderName: 'Usman Ali', riderPhone: '0312 5551002', riderStatus: 'on_the_way' },
  ),
  order(
    11,
    48,
    ['new', 'accepted', 'preparing', 'ready', 'shipped', 'out_for_delivery', 'delivered'],
    3,
    [item(earbuds, 1)],
    { type: 'nationwide', courier: 'Leopards', trackingId: 'LP40021987', trackingStatus: 'delivered' },
  ),
  order(
    12,
    52,
    ['new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
    0,
    [item(honey, 1), item(bag, 1, 'Blue')],
    { type: 'local', method: 'self' },
  ),
  order(
    13,
    75,
    ['new', 'accepted', 'preparing', 'ready', 'shipped', 'out_for_delivery', 'delivered'],
    4,
    [item(kurta, 1, 'XL / White')],
    { type: 'local', method: 'rider', riderId: 'r3', riderName: 'Hamza Riaz', riderPhone: '0313 5551003', riderStatus: 'delivered' },
    { discount: 200 },
  ),
  order(
    14,
    120,
    ['new', 'accepted', 'preparing', 'ready', 'shipped', 'out_for_delivery', 'delivered'],
    7,
    [item(lawn, 2)],
    { type: 'nationwide', courier: 'M&P', trackingId: 'MP88213400', trackingStatus: 'delivered' },
  ),
  order(15, 30, ['new', 'cancelled'], 5, [item(earbuds, 1)], { type: 'local' }, { cancelReason: 'Customer did not answer the phone' }),
  order(
    16,
    200,
    ['new', 'accepted', 'preparing', 'ready', 'shipped', 'out_for_delivery', 'delivered', 'returned'],
    1,
    [item(chappal, 1, '10')],
    { type: 'nationwide', courier: 'TCS', trackingId: '7723900012', trackingStatus: 'delivered' },
    { returnReason: 'Size too small' },
  ),
  order(
    17,
    300,
    ['new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'returned', 'refunded'],
    6,
    [item(bottle, 1)],
    { type: 'local', method: 'self' },
    { returnReason: 'Leaking lid', refund: 1500 },
  ),
  order(
    18,
    400,
    ['new', 'accepted', 'preparing', 'ready', 'shipped', 'out_for_delivery', 'delivered'],
    3,
    [item(dinner, 1)],
    { type: 'nationwide', courier: 'TCS', trackingId: '7723811110', trackingStatus: 'delivered' },
  ),
  order(
    19,
    600,
    ['new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
    2,
    [item(honey, 3)],
    { type: 'local', method: 'self' },
  ),
];

export const riders: Rider[] = [
  { id: 'r1', name: 'Bilal Ahmed', phone: '0311 5551001', vehicle: 'Bike', distanceKm: 0.8, rating: 4.9, deliveries: 412, online: true, available: true },
  { id: 'r2', name: 'Usman Ali', phone: '0312 5551002', vehicle: 'Bike', distanceKm: 1.6, rating: 4.7, deliveries: 268, online: true, available: true },
  { id: 'r3', name: 'Hamza Riaz', phone: '0313 5551003', vehicle: 'Bike', distanceKm: 2.3, rating: 4.8, deliveries: 351, online: true, available: true },
  { id: 'r4', name: 'Zeeshan Haider', phone: '0314 5551004', vehicle: 'Loader rickshaw', distanceKm: 3.1, rating: 4.5, deliveries: 97, online: true, available: false },
  { id: 'r5', name: 'Kashif Mehmood', phone: '0315 5551005', vehicle: 'Bike', distanceKm: 4.4, rating: 4.6, deliveries: 189, online: false, available: false },
];

export const posts: Post[] = [
  { id: 'po1', type: 'video', caption: 'Eid collection: our new cotton kurtas, in white and black.', media: [], productId: 'p1', productTitle: kurta.title, createdAt: ago(2 * DAY), views: 2340, likes: 186 },
  { id: 'po2', type: 'video', caption: 'Kids school bags are back in stock, blue and pink.', media: [], productId: 'p6', productTitle: bag.title, createdAt: ago(4 * DAY), views: 1210, likes: 74 },
  { id: 'po3', type: 'video', caption: 'How our Peshawari chappals are hand-made.', media: [], productId: 'p3', productTitle: chappal.title, createdAt: ago(7 * DAY), views: 5120, likes: 402 },
  { id: 'po4', type: 'video', caption: 'A quick tour of the shop on Bank Road.', media: [], createdAt: ago(10 * DAY), views: 880, likes: 51 },
]

export const notifications: AppNotification[] = [
  { id: 'n1', type: 'order', title: 'New order FZ-10231', body: "Ayesha Malik ordered Men's Cotton Kurta (L / White).", createdAt: ago(0.3 * HOUR), read: false, orderId: 'o1' },
  { id: 'n2', type: 'order', title: 'New order FZ-10232', body: 'Usman Tariq ordered Wireless Earbuds Pro.', createdAt: ago(1.2 * HOUR), read: false, orderId: 'o2' },
  { id: 'n3', type: 'stock', title: 'Out of stock', body: 'Wireless Earbuds Pro has no stock left. It shows as out of stock on Fazl.', createdAt: ago(3 * HOUR), read: false, productId: 'p4' },
  { id: 'n4', type: 'rider', title: 'Rider accepted', body: 'Bilal Ahmed accepted the delivery of FZ-10237.', createdAt: ago(8 * HOUR), read: true, orderId: 'o7' },
  { id: 'n6', type: 'shipping', title: 'Delivered', body: 'FZ-10241 was delivered by Leopards.', createdAt: ago(30 * HOUR), read: true, orderId: 'o11' },
  { id: 'n7', type: 'stock', title: 'Low stock', body: 'Lawn 3-Piece Suit has only 3 left.', createdAt: ago(40 * HOUR), read: true, productId: 'p2' },
  { id: 'n8', type: 'system', title: 'Welcome to Seller Central', body: 'Manage your products, orders and deliveries in one place.', createdAt: ago(10 * DAY), read: true },
];

export const settings: SellerSettings = {
  lowStockThreshold: 5,
  defaultLocalDelivery: 'rider',
  notifyNewOrders: true,
  notifyLowStock: true,
  notifyAds: true,
  notifyRiders: true,
};

export const CATEGORIES = [
  'Men Clothing',
  'Women Clothing',
  'Kids',
  'Footwear',
  'Electronics',
  'Mobile Accessories',
  'Home & Kitchen',
  'Grocery',
  'Beauty',
  'Other',
];
