import { BASE_URL, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';

/** The Fazl backend, without a trailing slash. Live when .env doesn't say. */
export const API_BASE_URL = (BASE_URL || 'https://api.fazlapp.com').replace(/\/+$/, '');

/** Fazl's own Google OAuth clients, so the backend accepts the ID token. */
export const GOOGLE_CONFIG = {
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
};

/**
 * What's on Fazl yet. Stock isn't (its backend chunk comes next): until then
 * its screens and fields stay hidden, so nothing a seller enters is silently
 * dropped. Sale prices are (Pricing & Promotions).
 */
export const FEATURES = {
  stock: false,
  sale: true,
  // Fazl riders and courier tracking: not on Fazl yet, so Local Delivery and
  // Shipping & Tracking stay out of the menu (orders themselves are real).
  delivery: false,
};
