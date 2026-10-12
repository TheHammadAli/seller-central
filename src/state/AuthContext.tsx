import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { preloadDashboard, whenDashboardPreloaded } from '../api';
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

/**
 * The splash over the app: at start, after logging in and on logging out.
 * `until` settles once what it covers is ready — Home's data loaded (start,
 * login), or the logout done — and `id` tells one splash from the next.
 */
export interface Splash {
  id: number;
  reason: 'start' | 'login' | 'logout';
  until: Promise<void>;
}

interface AuthState {
  seller: Seller | null;
  /** False until the saved login has been checked at startup. */
  ready: boolean;
  splash: Splash | null;
  /** The splash `id` has faded away. */
  splashDone: (id: number) => void;
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

/** A promise and the function that settles it. */
function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [ready, setReady] = useState(false);
  // The start splash covers checking the saved login and loading Home.
  const [startup] = useState(deferred);
  const [splash, setSplash] = useState<Splash | null>(() => ({
    id: 0,
    reason: 'start',
    until: startup.promise,
  }));

  useEffect(() => {
    const showSplash = (reason: Splash['reason'], until: Promise<void>) =>
      setSplash(s => ({ id: (s?.id ?? 0) + 1, reason, until }));
    setSessionExpiredHandler(() => {
      setSeller(null);
      showSplash('logout', Promise.resolve());
    });
    restoreSession()
      .then(restored => {
        // Home's data loads behind the splash, so Home opens with it.
        if (restored?.shop) preloadDashboard(restored.shop.id, restored.id);
        setSeller(restored);
      })
      .finally(() => {
        setReady(true);
        whenDashboardPreloaded().then(startup.resolve);
      });
  }, [startup]);

  const value = useMemo<AuthState>(() => {
    const showSplash = (reason: Splash['reason'], until: Promise<void>) =>
      setSplash(s => ({ id: (s?.id ?? 0) + 1, reason, until }));

    // Logged in: Home's data starts loading and the splash covers it, raised
    // in the same update as the switch, so Home never shows before it.
    const signedIn = (next: Seller) => {
      if (next.shop) preloadDashboard(next.shop.id, next.id);
      setSeller(next);
      showSplash('login', whenDashboardPreloaded());
    };

    return {
      seller,
      ready,
      splash,
      splashDone: id => setSplash(s => (s?.id === id ? null : s)),
      signIn: async (email, password) => {
        signedIn(await loginWithEmail(email, password));
      },
      signInWithGoogle: async () => {
        const idToken = await pickGoogleAccount();
        if (!idToken) return;
        try {
          signedIn(await loginWithGoogle(idToken));
        } catch (e) {
          // Let the user pick a different account next time.
          await forgetGoogleAccount();
          throw e;
        }
      },
      signInWithApple: async () => {
        const identity = await pickAppleIdentity();
        if (!identity) return;
        signedIn(await loginWithApple(identity.identityToken, identity.fullName));
      },
      signOut: async () => {
        // The splash first, over the logging out; the login screen when it fades.
        const leaving = (async () => {
          // While still logged in: the backend needs the session to drop this
          // phone from the seller's notifications.
          await stopPush();
          await logout();
          await forgetGoogleAccount();
          setSeller(null);
        })();
        showSplash('logout', leaving.catch(() => undefined));
        await leaving;
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
    };
  }, [seller, ready, splash]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
