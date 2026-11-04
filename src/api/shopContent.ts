// A shop's real products and videos on Fazl — the same endpoints the Fazl
// app's shop page uses ("List product", "Post video"), so whatever is posted
// here shows up in that shop on Fazl straight away, and the other way round.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { ListingType, Post, Product, Shop, VariationOption } from '../types/models';
import { CategoryWithParameters } from '../utils/categoryParameters';
import { api, ApiError } from './http';
import { LocalizedName, nameOf } from './session';
import { t } from '../i18n';

/** A photo or video file on the phone, ready to upload. */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

interface BackendProduct {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  images?: string[] | null;
  video?: string | null;
  categoryId?: string | null;
  category?: { id?: string; name?: LocalizedName } | null;
  parameters?: unknown;
  isVideoPost?: boolean;
  /** Retail (bought on Fazl) or classified (contact the seller). */
  type?: ListingType | null;
  isDisabled?: boolean;
  hiddenByOwner?: boolean;
  taggedProductId?: string | { id?: string; title?: string } | null;
  /** The sale (Pricing & Promotions); the backend works out whether it's on. */
  salePrice?: number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  createdAt: string;
}

function toOptions(parameters: unknown): VariationOption[] {
  if (!Array.isArray(parameters)) return [];
  return parameters
    .filter((p): p is { name: string; variants?: unknown } => typeof p?.name === 'string')
    .map(p => ({
      name: p.name,
      values: Array.isArray(p.variants) ? p.variants.map(String).filter(Boolean) : [],
    }))
    .filter(o => o.values.length > 0);
}

function toProduct(p: BackendProduct): Product {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    category: nameOf(p.category?.name),
    categoryId: p.categoryId ?? p.category?.id,
    images: p.images ?? [],
    video: p.video ?? undefined,
    price: p.price ?? 0,
    ...(p.salePrice != null ? { salePrice: p.salePrice } : {}),
    ...(p.saleStartsAt ? { saleStart: p.saleStartsAt } : {}),
    ...(p.saleEndsAt ? { saleEnd: p.saleEndsAt } : {}),
    options: toOptions(p.parameters),
    // As the Fazl app reads it: a listing without a type is classified.
    listingType: p.type === 'retail' ? 'retail' : 'classified',
    // Stock isn't on Fazl yet (see FEATURES).
    variants: [],
    stock: 0,
    available: !p.isDisabled,
    disabledByFazl: !!p.isDisabled && !p.hiddenByOwner,
    sold: 0,
    views: 0,
    createdAt: p.createdAt,
  };
}

// ---------- Categories ----------

export type ShopCategory = CategoryWithParameters;

/**
 * Every product category WITH every one's details (parameters), once per app
 * session. Heavy (a category like Cars carries its whole Make/Model list,
 * past a megabyte on its own), so only the fallback for a backend without
 * GET /categories/:id; see categoryDetails.
 */
let productCategoriesCache: Promise<CategoryWithParameters[]> | null = null;

function productCategoriesWithParameters(): Promise<CategoryWithParameters[]> {
  if (!productCategoriesCache) {
    productCategoriesCache = api<
      {
        id: string;
        name: LocalizedName;
        icon?: string | null;
        parameters?: CategoryWithParameters['parameters'];
      }[]
    >('/categories?type=product')
      .then(list =>
        (list ?? []).map(c => ({ id: c.id, name: nameOf(c.name), icon: c.icon, parameters: c.parameters })),
      )
      .catch(e => {
        productCategoriesCache = null; // try again next time
        throw e;
      });
  }
  return productCategoriesCache;
}

/** Icons already asked for this session. */
const prefetchedIcons = new Set<string>();

/**
 * Downloads categories' icons in the background as soon as the categories
 * are known, so the category list shows them at once instead of fetching
 * each when it opens. The same URL the list draws (trimmed), so it hits the
 * same cache.
 */
export function prefetchCategoryIcons(categories: { icon?: string | null }[]) {
  categories.forEach(c => {
    const url = typeof c.icon === 'string' ? c.icon.trim() : '';
    if (!url || prefetchedIcons.has(url)) return;
    prefetchedIcons.add(url);
    Image.prefetch(url).catch(() => prefetchedIcons.delete(url)); // try again next time
  });
}

interface BasicCategory {
  id: string;
  name: LocalizedName;
  type: string;
  icon?: string | null;
  groupedCategoryIds?: string[];
}

/**
 * Categories are kept on the phone: the list, and each category's details once
 * chosen. They rarely change, so the listing form opens with the kept copy at
 * once (rather than waiting a few seconds on the network for, say, Cars and
 * its whole Make/Model list) while a fresh copy is fetched behind it, used for
 * the rest of the session and kept for next time.
 */
const KEPT_LIST = 'categories:basic:v1';
const keptDetailsKey = (id: string) => `categories:details:v1:${id}`;

async function readKept<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The kept copy at once when there is one, else the network's. Either way a
 * fresh copy is fetched and kept, and handed to `onFresh`.
 */
export function keptThenFresh<T>(
  key: string,
  fetchFresh: () => Promise<T>,
  onFresh: (fresh: T) => void,
): Promise<T> {
  const fresh = fetchFresh().then(value => {
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
    onFresh(value);
    return value;
  });
  return readKept<T>(key).then(kept => {
    if (kept === undefined) return fresh;
    fresh.catch(() => {}); // the kept copy stands in; next time tries again
    return kept;
  });
}

/** Every category without details (light), once per app session. */
let basicCategoriesCache: Promise<BasicCategory[]> | null = null;

function basicCategories(): Promise<BasicCategory[]> {
  if (!basicCategoriesCache) {
    const loading = keptThenFresh(
      KEPT_LIST,
      () => api<BasicCategory[]>('/categories?fields=basic').then(list => list ?? []),
      fresh => {
        basicCategoriesCache = Promise.resolve(fresh);
      },
    );
    loading.catch(() => {
      if (basicCategoriesCache === loading) basicCategoriesCache = null; // try again next time
    });
    basicCategoriesCache = loading;
  }
  return basicCategoriesCache;
}

/** Each category's details once fetched, for the rest of the app session. */
const detailsCache = new Map<string, Promise<CategoryWithParameters>>();

interface CategoryDetailsResponse {
  id?: string;
  name: LocalizedName;
  icon?: string | null;
  parameters?: CategoryWithParameters['parameters'];
}

/**
 * One category with its details (parameters), fetched only when it is
 * chosen: GET /categories/:id, a few kilobytes, instead of every category's.
 * A backend without that route yet (404) is answered from the full list.
 */
export function categoryDetails(id: string): Promise<CategoryWithParameters> {
  let found = detailsCache.get(id);
  if (!found) {
    // Kept as the backend sends it (both languages' names), named on reading.
    const toDetails = (c: CategoryDetailsResponse): CategoryWithParameters => ({
      id: c?.id ?? id,
      name: nameOf(c?.name),
      icon: c?.icon,
      parameters: c?.parameters,
    });
    const loading = keptThenFresh(
      keptDetailsKey(id),
      () =>
        api<CategoryDetailsResponse>(`/categories/${encodeURIComponent(id)}`).catch(async e => {
          if (e instanceof ApiError && e.status === 404) {
            const match = (await productCategoriesWithParameters()).find(c => c.id === id);
            if (match) return match;
          }
          throw e;
        }),
      fresh => detailsCache.set(id, Promise.resolve(toDetails(fresh))),
    ).then(toDetails);
    loading.catch(() => {
      if (detailsCache.get(id) === loading) detailsCache.delete(id); // try again next time
    });
    detailsCache.set(id, loading);
    found = loading;
  }
  return found;
}

/** A shop with this many categories or fewer gets every one's details ahead. */
const FEW_CATEGORIES = 8;

/**
 * The listing form's categories made ready before it opens (called once the
 * shop is known): the shop's list with its icons and, for a shop with only a
 * few categories (one of its own, or e.g. Vehicles' Cars and Motor Bikes),
 * each one's details too.
 */
export function prepareShopCategories(shop: Shop) {
  shopCategories(shop)
    .then(({ categories }) => {
      if (categories.length > FEW_CATEGORIES) return;
      categories.forEach(c => categoryDetails(c.id).catch(() => {}));
    })
    .catch(() => {});
}

/**
 * The categories this shop may list in (without their details — see
 * categoryDetails), exactly as the Fazl app's listing form decides: a shop
 * filed under a product category is locked to it (shown, not chosen); one
 * filed under a "shop" category (e.g. Vehicles) chooses among the product
 * categories grouped under it.
 */
export async function shopCategories(
  shop: Shop,
): Promise<{ categories: ShopCategory[]; locked: boolean }> {
  const all = await basicCategories();
  const products: ShopCategory[] = all
    .filter(c => c.type === 'product')
    .map(c => ({ id: c.id, name: nameOf(c.name), icon: c.icon }));
  const own = all.find(c => c.id === shop.categoryId);
  const result = (() => {
    if (own?.type === 'product') {
      const locked = products.find(c => c.id === shop.categoryId);
      if (locked) return { categories: [locked], locked: true };
    }
    if (own?.type === 'shop' && own.groupedCategoryIds?.length) {
      const ids = own.groupedCategoryIds;
      return { categories: products.filter(c => ids.includes(c.id)), locked: false };
    }
    return { categories: products, locked: false };
  })();
  prefetchCategoryIcons(result.categories);
  return result;
}

// ---------- Products ----------

/**
 * Every product of the shop for its owner, hidden ones included. A backend
 * from before the owner list existed only has the public list (no hidden ones).
 */
export async function listShopProducts(shopId: string): Promise<Product[]> {
  let items: BackendProduct[];
  try {
    items = await api<BackendProduct[]>(`/products/shop/${shopId}/manage?page=1&limit=200`);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
    items = await api<BackendProduct[]>(`/products/shop/${shopId}?page=1&limit=200`);
  }
  return (items ?? []).map(toProduct);
}

/** One of the shop's products, hidden or not (the public detail skips hidden ones). */
export async function getShopProduct(shopId: string, productId: string): Promise<Product> {
  const product = (await listShopProducts(shopId)).find(p => p.id === productId);
  if (!product) throw new Error(t('This product is no longer in your shop.'));
  return product;
}

/**
 * The seller's "Available on Fazl" switch: hidden products disappear from
 * everything customers see on Fazl (home, search, feed, the shop page).
 */
export async function setProductAvailable(productId: string, available: boolean): Promise<void> {
  await api(`/products/${productId}/visibility`, { method: 'PATCH', body: { hidden: !available } });
}

/**
 * Puts a product on sale, changes its sale, or ends it (`salePrice: null`).
 * Dates are ISO times; none means at once / until ended. Fazl switches to the
 * sale price and back by itself on them.
 */
export async function setProductSale(
  productId: string,
  sale: { salePrice: number | null; saleStartsAt?: string | null; saleEndsAt?: string | null },
): Promise<void> {
  await api(`/products/${productId}/sale`, { method: 'PATCH', body: sale });
}

export interface ProductDraft {
  title: string;
  description: string;
  categoryId: string;
  /** Optional, as on Fazl: none shows no price (stored as 0). Retail needs one. */
  price: number | null;
  /** Retail: bought on Fazl. Classified: customers contact the shop. Editing
   *  sends the product's own type back, so it never changes by itself. */
  listingType: ListingType;
  /** The listing's details, as the backend stores them. */
  parameters: { name: string; variants: string[] }[];
  /** Photos picked on the phone; ones already on Fazl stay as they are. */
  newImages: UploadFile[];
  newVideo?: UploadFile;
  /** URLs of photos/videos already on Fazl that the seller removed. */
  removedMedia: string[];
}

function productForm(d: ProductDraft): FormData {
  const form = new FormData();
  form.append('title', d.title);
  form.append('description', d.description);
  form.append('category', d.categoryId);
  form.append('price', String(d.price ?? 0));
  form.append('type', d.listingType);
  form.append('parameters', JSON.stringify(d.parameters));
  // React Native's FormData takes { uri, name, type } as a file.
  d.newImages.forEach(f => form.append('images', f as unknown as Blob));
  if (d.newVideo) form.append('video', d.newVideo as unknown as Blob);
  return form;
}

export async function createShopProduct(shopId: string, d: ProductDraft): Promise<Product> {
  const res = await api<{ product: BackendProduct }>(`/products/${shopId}/shop`, {
    method: 'POST',
    form: productForm(d),
  });
  return toProduct(res.product);
}

export async function updateShopProduct(productId: string, d: ProductDraft): Promise<Product> {
  if (d.removedMedia.length) {
    await api(`/products/${productId}/media`, { method: 'DELETE', body: { media: d.removedMedia } });
  }
  const res = await api<{ product: BackendProduct }>(`/products/${productId}`, {
    method: 'PUT',
    form: productForm(d),
  });
  return toProduct(res.product);
}

export async function deleteShopProduct(productId: string): Promise<void> {
  await api(`/products/${productId}`, { method: 'DELETE' });
}

// ---------- Videos ----------

/** The shop's video posts and its product listings that carry a video. */
export async function listShopVideos(shopId: string): Promise<Post[]> {
  const items = await api<BackendProduct[]>(`/video-posts/shop/${shopId}?page=1&limit=100`);
  return (items ?? []).map(p => {
    const tagged = p.taggedProductId;
    return {
      id: p.id,
      type: 'video' as const,
      caption: p.title,
      media: p.video ? [p.video] : [],
      productId: typeof tagged === 'string' ? tagged : tagged?.id,
      productTitle: typeof tagged === 'object' ? tagged?.title : undefined,
      isListing: !p.isVideoPost,
      createdAt: p.createdAt,
    };
  });
}

export async function postShopVideo(
  shopId: string,
  v: { caption: string; video: UploadFile; taggedProductId?: string },
): Promise<void> {
  const form = new FormData();
  form.append('title', v.caption);
  form.append('video', v.video as unknown as Blob);
  if (v.taggedProductId) form.append('taggedProductId', v.taggedProductId);
  await api(`/video-posts/${shopId}`, { method: 'POST', form });
}

export async function deleteShopVideo(postId: string): Promise<void> {
  await api(`/video-posts/${postId}`, { method: 'DELETE' });
}
