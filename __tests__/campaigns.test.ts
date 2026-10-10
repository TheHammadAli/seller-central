import {
  getCampaign,
  listCampaigns,
  saveCampaign,
  setCampaignStatus,
} from '../src/api/campaigns';
import { api } from '../src/api/http';

jest.mock('../src/api/http', () => ({ api: jest.fn() }));
jest.mock('../src/i18n', () => ({ t: (key: string) => key }));

const call = api as jest.Mock;

beforeEach(() => {
  call.mockReset();
});

test('campaign reads use the selected shop and propagate network errors', async () => {
  call.mockResolvedValueOnce([]);
  await expect(listCampaigns('shop-a')).resolves.toEqual([]);
  expect(call).toHaveBeenLastCalledWith('/seller/shops/shop-a/campaigns');
  call.mockRejectedValueOnce(new Error('Offline'));
  await expect(getCampaign('shop-b', 'campaign-a')).rejects.toThrow('Offline');
  expect(call).toHaveBeenLastCalledWith(
    '/seller/shops/shop-b/campaigns/campaign-a',
  );
});

test('saving and changing status send writes to the server', async () => {
  const input = {
    name: 'My business',
    targetType: 'shop' as const,
    productId: null,
    budget: 500,
    startDate: '2026-10-10T00:00:00Z',
    endDate: '2026-10-15T23:59:59Z',
    status: 'paused' as const,
  };
  await saveCampaign('shop-a', input);
  expect(call).toHaveBeenLastCalledWith('/seller/shops/shop-a/campaigns', {
    method: 'POST',
    body: input,
  });
  await saveCampaign('shop-a', input, 'c1');
  expect(call).toHaveBeenLastCalledWith('/seller/shops/shop-a/campaigns/c1', {
    method: 'PATCH',
    body: input,
  });
  await setCampaignStatus('shop-a', 'c1', 'completed');
  expect(call).toHaveBeenLastCalledWith(
    '/seller/shops/shop-a/campaigns/c1/status',
    { method: 'PATCH', body: { status: 'completed' } },
  );
});

test('no shop never falls back to shared demo campaigns', async () => {
  await expect(listCampaigns('')).rejects.toThrow('No shop');
  expect(call).not.toHaveBeenCalled();
});
