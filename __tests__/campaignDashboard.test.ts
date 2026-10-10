import { getDashboard } from '../src/api';
import { listCampaigns } from '../src/api/campaigns';
import { Campaign } from '../src/types/models';

jest.mock('../src/api/campaigns', () => ({ listCampaigns: jest.fn() }));
jest.mock('../src/api/orders', () => ({ listShopOrders: jest.fn(async () => []) }));
jest.mock('../src/api/notifications', () => ({ sellerUnreadCount: jest.fn(async () => 0) }));
jest.mock('../src/i18n', () => ({ t: (key: string) => key }));

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
