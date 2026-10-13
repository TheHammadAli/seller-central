import { getSettings, saveSettings } from '../src/api';
import { ApiError } from '../src/api/http';
import { getNotificationSwitches, setNotificationSwitches } from '../src/api/notifications';

jest.mock('../src/api/notifications', () => ({
  getNotificationSwitches: jest.fn(),
  setNotificationSwitches: jest.fn(),
}));
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

const allOn = { newOrders: true, lowStock: true, riders: true, ads: true };

beforeEach(async () => {
  jest.clearAllMocks();
  (getNotificationSwitches as jest.Mock).mockResolvedValue(allOn);
  await getSettings('u1');
});

test("shows the account's switches as Fazl keeps them", async () => {
  (getNotificationSwitches as jest.Mock).mockResolvedValue({ ...allOn, newOrders: false, ads: false });

  const settings = await getSettings('u1');

  expect(getNotificationSwitches).toHaveBeenCalledWith('u1');
  expect(settings).toMatchObject({
    notifyNewOrders: false,
    notifyLowStock: true,
    notifyRiders: true,
    notifyAds: false,
  });
});

test('saves only the switch that changed, on Fazl', async () => {
  (setNotificationSwitches as jest.Mock).mockResolvedValue({ ...allOn, newOrders: false });
  const settings = await getSettings('u1');

  const saved = await saveSettings({ ...settings, notifyNewOrders: false }, 'u1');

  expect(setNotificationSwitches).toHaveBeenCalledWith('u1', { newOrders: false });
  expect(saved.notifyNewOrders).toBe(false);
});

test("a change that isn't a switch doesn't go to Fazl", async () => {
  const settings = await getSettings('u1');

  const saved = await saveSettings({ ...settings, lowStockThreshold: 9 }, 'u1');

  expect(setNotificationSwitches).not.toHaveBeenCalled();
  expect(saved.lowStockThreshold).toBe(9);
});

test("a switch Fazl couldn't save stays as it was", async () => {
  (setNotificationSwitches as jest.Mock).mockRejectedValue(new ApiError('No internet', 0));
  const settings = await getSettings('u1');

  await expect(saveSettings({ ...settings, notifyAds: false }, 'u1')).rejects.toThrow('No internet');
  expect((await getSettings()).notifyAds).toBe(true);
});

test('a backend without the switches still opens Settings', async () => {
  (getNotificationSwitches as jest.Mock).mockRejectedValue(new ApiError('Cannot GET', 404));

  await expect(getSettings('u1')).resolves.toMatchObject({ notifyNewOrders: true });
});
