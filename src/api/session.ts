// Logging in with the seller's Fazl account (email + password, or Google)
// and finding their shops. Seller Central is for shop owners: an account
// without a shop sees the "create your shop" screen, and one with several
// picks which shop to manage (remembered, and switchable later).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Seller, Shop } from '../types/models';
import { isUrdu, t } from '../i18n';
import { api, ApiError, currentTokens, loadTokens, saveTokens } from './http';

const SELLER_KEY = 'sellerCentral.seller';
/** Per account, so a shared phone remembers each seller's own choice. */
const activeShopKey = (userId: string) => `sellerCentral.activeShop.${userId}`;
/** The shop Home showed last, chosen or the only one (per account). */
const lastShopKey = (userId: string) => `sellerCentral.lastShop.${userId}`;

/**
 * Told the shop Home showed last as soon as the account is known — before the
 * shop list is in — so Home's data can start loading alongside it.
 */
export type OnLastShop = (shopId: string, userId: string) => void;

interface BackendUser {
  id?: string;
  sub?: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  refreshToken?: string;
}

export type LocalizedName = string | { en?: string; ur?: string } | null | undefined;

interface BackendShop {
  id: string;
  title: string;
  image?: string | null;
  banner?: string | null;
  address?: string | null;
  description?: string | null;
  category?: { name?: LocalizedName } | null;
  subcategory?: { name?: LocalizedName } | null;
  area?: string | null;
  city?: string | null;
  contact?: string | null;
  openingHours?: string | null;
  isDisabled?: boolean;
  categoryId?: string | null;
  subcategoryId?: string | null;
}

/** A name in the app's language (falling back to the other one). */
export const nameOf = (name: LocalizedName) =>
  typeof name === 'string' ? name : (isUrdu ? name?.ur || name?.en : name?.en || name?.ur) ?? '';

function toShop(s: BackendShop, ownerName: string): Shop {
  return {
    id: s.id,
    name: s.title,
    ownerName,
    category: nameOf(s.subcategory?.name) || nameOf(s.category?.name),
    description: s.description ?? '',
    address: s.address ?? '',
    area: s.area ?? '',
    city: s.city ?? '',
    contact: s.contact ?? '',
    openingHours: s.openingHours ?? '',
    logo: s.image ?? undefined,
    banner: s.banner ?? undefined,
    disabled: !!s.isDisabled,
    categoryId: s.categoryId ?? undefined,
    subcategoryId: s.subcategoryId ?? undefined,
  };
}

/**
 * The account plus its shops, with the active one: the shop chosen last time
 * if it still exists, the only shop if there is one, else none yet — then
 * the app asks which one to manage.
 */
/** Who is logged in, without their shops. */
type Profile = Pick<Seller, 'id' | 'name' | 'email' | 'phone'>;

const profileFrom = (s: Seller): Profile => ({ id: s.id, name: s.name, email: s.email, phone: s.phone });

/** A shop Fazl's admin has suspended can't be chosen, so it isn't listed. */
const selectable = (shops: Shop[]) => shops.filter(s => !s.disabled);

async function sellerFor(user: Profile, onLastShop?: OnLastShop): Promise<Seller> {
  const shopsRequest = api<BackendShop[]>('/shops/userShops');
  // Awaited below; this only keeps a quick failure from being reported as unhandled meanwhile.
  shopsRequest.catch(() => undefined);
  const remembered = await AsyncStorage.getMany([activeShopKey(user.id), lastShopKey(user.id)]);
  const chosenId = remembered[activeShopKey(user.id)];
  const lastId = remembered[lastShopKey(user.id)];
  if (lastId) onLastShop?.(lastId, user.id);
  const shops = selectable(((await shopsRequest) ?? []).map(s => toShop(s, user.name)));
  const shop = shops.find(s => s.id === chosenId) ?? (shops.length === 1 ? shops[0] : null);
  const seller: Seller = { ...user, shops, shop };
  await AsyncStorage.setMany({
    [SELLER_KEY]: JSON.stringify(seller),
    ...(shop ? { [lastShopKey(user.id)]: shop.id } : {}),
  });
  return seller;
}

/** Makes `shopId` the shop Seller Central manages, and remembers it. */
export async function chooseShop(seller: Seller, shopId: string): Promise<Seller> {
  const shop = seller.shops.find(s => s.id === shopId);
  if (!shop) throw new Error(t('That shop is no longer on your account.'));
  const next = { ...seller, shop };
  await AsyncStorage.setMany({
    [activeShopKey(seller.id)]: shopId,
    [lastShopKey(seller.id)]: shopId,
    [SELLER_KEY]: JSON.stringify(next),
  });
  return next;
}

/** The account's shops again, e.g. after one was created or changed in the Fazl app. */
export async function refreshShops(seller: Seller): Promise<Seller> {
  return sellerFor(profileFrom(seller));
}

const profileOf = (u: BackendUser): Profile => ({
  id: (u.id ?? u.sub) as string,
  name: u.name || u.email,
  email: u.email,
  phone: u.phone || undefined,
});

export async function loginWithEmail(
  email: string,
  password: string,
  onLastShop?: OnLastShop,
): Promise<Seller> {
  const data = await api<{ accessToken: string; refreshToken: string; user: BackendUser }>('/auth/login', {
    method: 'POST',
    body: { email, password, loginContext: 'app' },
    auth: false,
  });
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return sellerFor(profileOf(data.user), onLastShop);
}

/**
 * Google sign-in for an existing Fazl account only: `allowSignUp: false` makes
 * the backend refuse an email that isn't registered (404) instead of
 * creating a new account for it.
 */
export async function loginWithGoogle(idToken: string, onLastShop?: OnLastShop): Promise<Seller> {
  const data = await api<{ accessToken: string; user: BackendUser }>('/auth/google/verify/token', {
    method: 'POST',
    body: { idToken, allowSignUp: false },
    auth: false,
  });
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.user.refreshToken });
  return sellerFor(profileOf(data.user), onLastShop);
}

/**
 * Sign in with Apple (iPhone) for an existing Fazl account only, as for
 * Google: `allowSignUp: false` makes the backend refuse an Apple ID that has
 * no Fazl account (404) instead of creating one.
 */
export async function loginWithApple(
  identityToken: string,
  fullName: { givenName: string | null; familyName: string | null },
  onLastShop?: OnLastShop,
): Promise<Seller> {
  const data = await api<{ accessToken: string; user: BackendUser }>('/auth/apple/verify/token', {
    method: 'POST',
    body: { identityToken, fullName, allowSignUp: false },
    auth: false,
  });
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.user.refreshToken });
  return sellerFor(profileOf(data.user), onLastShop);
}

/**
 * The saved login, re-checked with the backend (the shop may have changed).
 * Offline, the saved copy is used; a login the backend no longer accepts is
 * cleared.
 */
export async function restoreSession(onLastShop?: OnLastShop): Promise<Seller | null> {
  if (!(await loadTokens())) return null;
  let saved: Seller | null = null;
  try {
    const raw = await AsyncStorage.getItem(SELLER_KEY);
    saved = raw ? (JSON.parse(raw) as Seller) : null;
  } catch {
    saved = null;
  }
  if (!saved) {
    await clearSession();
    return null;
  }
  try {
    return await sellerFor(profileFrom(saved), onLastShop);
  } catch (e) {
    if (e instanceof ApiError && e.status === 0) {
      // Offline: the saved copy (one saved by an older version has no list,
      // and may still hold a suspended shop).
      const shops = selectable(saved.shops ?? (saved.shop ? [saved.shop] : []));
      const shop = shops.find(s => s.id === saved.shop?.id) ?? (shops.length === 1 ? shops[0] : null);
      return { ...saved, shops, shop };
    }
    await clearSession();
    return null;
  }
}

export async function logout(): Promise<void> {
  const refreshToken = currentTokens()?.refreshToken;
  if (refreshToken) {
    // Best effort: the session ends on this phone either way.
    await api('/auth/logout', { method: 'POST', body: { token: refreshToken } }).catch(() => undefined);
  }
  await clearSession();
}

async function clearSession() {
  await saveTokens(null);
  await AsyncStorage.removeItem(SELLER_KEY);
}
