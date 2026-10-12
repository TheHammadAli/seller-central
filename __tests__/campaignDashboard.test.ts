import { getDashboard } from '../src/api';
import { listCampaigns } from '../src/api/campaigns';
import { getOrderSummary } from '../src/api/orders';
import { Campaign } from '../src/types/models';

jest.mock('../src/api/campaigns', () => ({ listCampaigns: jest.fn() }));
jest.mock('../src/api/orders', () => ({
  listShopOrders: jest.fn(async () => []),
  getOrderSummary: jest.fn(async () => ({ all: {}, today: {}, recent: [] })),
}));
jest.mock('../src/api/notifications', () => ({ sellerUnreadCount: jest.fn(async () => 0) }));
jest.mock('../src/i18n', () => ({ t: (key: string) => key }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));

test('Home adds up the order summary, counting earnings as the Earnings page does', async () => {
  (listCampaigns as jest.Mock).mockResolvedValue([]);
  (getOrderSummary as jest.Mock).mockResolvedValueOnce({
    all: {
      new: { count: 2, net: 3000 },
      accepted: { count: 1, net: 500 },
      shipped: { count: 1, net: 700 },
      delivered: { count: 3, net: 4500 },
      refunded: { count: 1, net: 600 },
      cancelled: { count: 1, net: 900 },
    },
    today: { new: { count: 1, net: 1000 }, delivered: { count: 1, net: 2500 } },
    recent: [],
  });
  const dashboard = await getDashboard('shop-a', 'owner-a');
  expect(dashboard).toMatchObject({
    todayOrders: 2,
    todayEarnings: 2500,
    newOrders: 2,
    pendingOrders: 3,
    completedOrders: 3,
    pendingDeliveries: 1,
    totalEarnings: 5100,
  });
  // Asked for the phone's own today.
  const [, from, to] = (getOrderSummary as jest.Mock).mock.calls[0];
  expect(to.getTime() - from.getTime()).toBeGreaterThanOrEqual(23 * 3_600_000);
  expect(from.getHours()).toBe(0);
});

test('dashboard uses this shop, excludes scheduled campaigns from active count and retains completed performance', async () => {
  const base: Campaign = {
    id: 'c1', shopId: 'shop-a', name: 'Campaign', targetType: 'shop', productId: null,
    productTitle: 'Shop', budget: 1000, spent: 10, sales: 100, impressions: 20,
    clicks: 2, orders: 1, startDate: '', endDate: '', status: 'active', isScheduled: false, deliveryEnabled: false,
  };
  (listCampaigns as jest.Mock).mockResolvedValue([
    base,
    { ...base, id: 'c2', status: 'completed' },
    { ...base, id: 'c3', isScheduled: true, spent: 0, sales: 0, impressions: 0, clicks: 0, orders: 0 },
  ]);
  const dashboard = await getDashboard('shop-a', 'owner-a');
  expect(listCampaigns).toHaveBeenCalledWith('shop-a');
  expect(dashboard.activeAds.map(c => c.id)).toEqual(['c1']);
  expect(dashboard.adTotals).toEqual({ spent: 20, sales: 200, impressions: 40, clicks: 4, orders: 2 });
});

test('failed campaign loading is surfaced instead of showing sample performance', async () => {
  (listCampaigns as jest.Mock).mockRejectedValue(new Error('Cannot load campaigns'));
  await expect(getDashboard('shop-b', 'owner-a')).rejects.toThrow('Cannot load campaigns');
});
