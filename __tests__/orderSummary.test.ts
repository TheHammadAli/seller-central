import { api, ApiError } from '../src/api/http';
import { getOrderSummary } from '../src/api/orders';

jest.mock('../src/api/http', () => {
  class MockApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { api: jest.fn(), ApiError: MockApiError };
});
jest.mock('../src/i18n', () => ({ t: (key: string) => key, isUrdu: false }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));

const FROM = new Date(2026, 9, 12);
const TO = new Date(2026, 9, 13);

const order = (id: string, status: string, createdAt: string, amount: number, refundAmount?: number) => ({
  id,
  status,
  createdAt,
  updatedAt: createdAt,
  amount,
  quantity: 1,
  refundAmount,
  deliveryOption: 'delivery',
  paymentType: 'cashonDelivery',
  productId: 'p1',
});

beforeEach(() => (api as jest.Mock).mockReset());

test("takes Fazl's summary in the app's statuses: in transit counts as shipped, refunds come off", async () => {
  (api as jest.Mock).mockResolvedValueOnce({
    byStatus: {
      shipped: { count: 1, amount: 1000, refunded: 0 },
      in_transit: { count: 2, amount: 3000, refunded: 0 },
      refunded: { count: 1, amount: 2000, refunded: 500 },
    },
    todayByStatus: { pending: { count: 1, amount: 700, refunded: 0 } },
    recent: [order('o1', 'pending', '2026-10-12T05:00:00.000Z', 700)],
  });

  const summary = await getOrderSummary('shop-a', FROM, TO);

  expect(summary.all).toEqual({
    shipped: { count: 3, net: 4000 },
    refunded: { count: 1, net: 1500 },
  });
  expect(summary.today).toEqual({ new: { count: 1, net: 700 } });
  expect(summary.recent.map(o => [o.id, o.status])).toEqual([['o1', 'new']]);
  const path = (api as jest.Mock).mock.calls[0][0] as string;
  expect(path).toContain('/orders/shop/shop-a/manage/summary?from=');
  expect(path).toContain(encodeURIComponent(FROM.toISOString()));
});

test('a backend without the summary gets every order instead, added up the same way', async () => {
  const inDay = new Date(2026, 9, 12, 10).toISOString();
  const dayBefore = new Date(2026, 9, 11, 10).toISOString();
  (api as jest.Mock)
    .mockRejectedValueOnce(new ApiError('Cannot GET', 404))
    .mockResolvedValueOnce([
      order('o3', 'delivered', inDay, 2500),
      order('o2', 'refunded', dayBefore, 1000, 400),
      order('o1', 'pending', dayBefore, 800),
    ]);

  const summary = await getOrderSummary('shop-a', FROM, TO);

  expect(summary.all).toEqual({
    delivered: { count: 1, net: 2500 },
    refunded: { count: 1, net: 600 },
    new: { count: 1, net: 800 },
  });
  expect(summary.today).toEqual({ delivered: { count: 1, net: 2500 } });
  expect(summary.recent.map(o => o.id)).toEqual(['o3', 'o2', 'o1']);
});

test('any other failure is passed on, not hidden by the fallback', async () => {
  (api as jest.Mock).mockRejectedValueOnce(new ApiError('No internet', 0));
  await expect(getOrderSummary('shop-a', FROM, TO)).rejects.toThrow('No internet');
  expect(api).toHaveBeenCalledTimes(1);
});
