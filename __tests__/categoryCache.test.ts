import type { Shop } from '../src/types/models';

const mockStore = new Map<string, string>();
const mockApi = jest.fn();

jest.mock('../src/api/http', () => {
  class MockApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { api: (...args: unknown[]) => mockApi(...args), ApiError: MockApiError };
});
jest.mock('../src/i18n', () => ({ t: (key: string) => key, isUrdu: false }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
  },
}));

type ShopContent = typeof import('../src/api/shopContent');

/** shopContent as a fresh app session sees it: nothing in memory yet. */
function newSession(): ShopContent {
  let mod: ShopContent | undefined;
  jest.isolateModules(() => {
    mod = require('../src/api/shopContent');
  });
  return mod!;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>(resolve => setImmediate(() => resolve()));

const LIST = [
  { id: 'vehicles', name: { en: 'Vehicles' }, type: 'shop', groupedCategoryIds: ['cars', 'bikes'] },
  { id: 'cars', name: { en: 'Cars' }, type: 'product' },
  { id: 'bikes', name: { en: 'Motor Bikes' }, type: 'product' },
  { id: 'mobile', name: { en: 'Mobile' }, type: 'product' },
];
const CARS = { id: 'cars', name: { en: 'Cars' }, parameters: { en: [{ name: 'Make', values: ['Honda'] }] } };
const vehiclesShop = { id: 's1', categoryId: 'vehicles' } as Shop;

beforeEach(() => {
  mockStore.clear();
  mockApi.mockReset();
});

test('the first time, the network answers and its copy is kept on the phone', async () => {
  mockApi.mockImplementation(async (path: string) => (path === '/categories?fields=basic' ? LIST : CARS));
  const { shopCategories, categoryDetails } = newSession();

  const { categories, locked } = await shopCategories(vehiclesShop);
  expect(categories.map(c => c.id)).toEqual(['cars', 'bikes']);
  expect(locked).toBe(false);
  expect((await categoryDetails('cars')).parameters).toEqual(CARS.parameters);
  await flush();

  expect(JSON.parse(mockStore.get('categories:basic:v1')!)).toEqual(LIST);
  expect(JSON.parse(mockStore.get('categories:details:v1:cars')!)).toEqual(CARS);
});

test('the next time, the kept copy shows at once and a fresh one replaces it behind', async () => {
  mockStore.set('categories:basic:v1', JSON.stringify(LIST));
  mockStore.set('categories:details:v1:cars', JSON.stringify(CARS));
  const pending: Record<string, ReturnType<typeof deferred<unknown>>> = {};
  mockApi.mockImplementation((path: string) => (pending[path] = deferred<unknown>()).promise);
  const { shopCategories, categoryDetails } = newSession();

  // Answered while the network hasn't.
  const { categories } = await shopCategories(vehiclesShop);
  expect(categories.map(c => c.name)).toEqual(['Cars', 'Motor Bikes']);
  expect(await categoryDetails('cars')).toEqual({
    id: 'cars',
    name: 'Cars',
    icon: undefined,
    parameters: CARS.parameters,
  });

  const freshCars = { ...CARS, parameters: { en: [{ name: 'Make', values: ['Honda', 'Toyota'] }] } };
  pending['/categories/cars'].resolve(freshCars);
  pending['/categories?fields=basic'].resolve(LIST);
  await flush();

  expect(JSON.parse(mockStore.get('categories:details:v1:cars')!)).toEqual(freshCars);
  // The rest of the session uses the fresh copy, without asking again.
  expect((await categoryDetails('cars')).parameters).toEqual(freshCars.parameters);
  expect(mockApi).toHaveBeenCalledTimes(2);
});

test('a failed fetch with nothing kept is asked again the next time', async () => {
  mockApi.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(CARS);
  const { categoryDetails } = newSession();

  await expect(categoryDetails('cars')).rejects.toThrow('offline');
  await expect(categoryDetails('cars')).resolves.toMatchObject({ id: 'cars', name: 'Cars' });
  expect(mockApi).toHaveBeenCalledTimes(2);
});

test("a shop with a few categories gets every one's details ahead of the form", async () => {
  mockApi.mockImplementation(async (path: string) =>
    path === '/categories?fields=basic' ? LIST : { id: path.split('/').pop(), name: { en: 'x' } },
  );
  const { prepareShopCategories } = newSession();

  prepareShopCategories(vehiclesShop);
  await flush();
  await flush();

  expect(mockApi.mock.calls.map(([path]) => path).sort()).toEqual([
    '/categories/bikes',
    '/categories/cars',
    '/categories?fields=basic',
  ]);
});

test('a shop open to many categories only gets the list ahead', async () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, name: { en: `C${i}` }, type: 'product' }));
  mockApi.mockImplementation(async () => many);
  const { prepareShopCategories } = newSession();

  prepareShopCategories({ id: 's2' } as Shop);
  await flush();
  await flush();

  expect(mockApi.mock.calls.map(([path]) => path)).toEqual(['/categories?fields=basic']);
});
