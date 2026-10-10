import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { pickAppleIdentity } from '../api/apple';
import { forgetGoogleAccount, pickGoogleAccount } from '../api/google';
import { setSessionExpiredHandler } from '../api/http';
import {
  chooseShop,
  loginWithApple,
  loginWithEmail,
  loginWithGoogle,
  logout,
  refreshShops,
  restoreSession,
} from '../api/session';
import { Seller, Shop } from '../types/models';
import { stopPush } from '../push';

interface AuthState {
  seller: Seller | null;
  /** False until the saved login has been checked at startup. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves without signing in if the user backs out of Google's chooser. */
  signInWithGoogle: () => Promise<void>;
  /** iPhone only. Resolves without signing in if the user closes Apple's sheet. */
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Makes this one of the account's shops the one being managed. */
  selectShop: (shopId: string) => Promise<void>;
  /** Reloads the account's shops from Fazl (e.g. one was added in the Fazl app). */
  reloadShops: () => Promise<void>;
  /** A shop was just created here: reloads the shops and opens the new one. False if it isn't listed yet. */
  shopCreated: (shopId: string) => Promise<boolean>;
  /** After the business profile is saved, so headers show the new name. */
  setShop: (shop: Shop) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionExpiredHandler(() => setSeller(null));
    restoreSession()
      .then(setSeller)
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      seller,
      ready,
      signIn: async (email, password) => {
        setSeller(await loginWithEmail(email, password));
      },
      signInWithGoogle: async () => {
        const idToken = await pickGoogleAccount();
        if (!idToken) return;
        try {
          setSeller(await loginWithGoogle(idToken));
        } catch (e) {
          // Let the user pick a different account next time.
          await forgetGoogleAccount();
          throw e;
        }
      },
      signInWithApple: async () => {
        const identity = await pickAppleIdentity();
        if (!identity) return;
        setSeller(await loginWithApple(identity.identityToken, identity.fullName));
      },
      signOut: async () => {
        // While still logged in: the backend needs the session to drop this
        // phone from the seller's notifications.
        await stopPush();
        await logout();
        await forgetGoogleAccount();
        setSeller(null);
      },
      selectShop: async shopId => {
        if (seller) setSeller(await chooseShop(seller, shopId));
      },
      reloadShops: async () => {
        if (seller) setSeller(await refreshShops(seller));
      },
      shopCreated: async shopId => {
        if (!seller) return false;
        const withNewShop = await refreshShops(seller);
        const listed = withNewShop.shops.some(s => s.id === shopId);
        setSeller(listed ? await chooseShop(withNewShop, shopId) : withNewShop);
        return listed;
      },
      setShop: shop =>
        setSeller(s =>
          s ? { ...s, shop, shops: s.shops.map(x => (x.id === shop.id ? shop : x)) } : s,
        ),
    }),
    [seller, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
