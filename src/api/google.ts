import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_CONFIG } from '../config';
import { t } from '../i18n';

let configured = false;

function configure() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_CONFIG.webClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
  });
  configured = true;
}

/**
 * Shows Google's account chooser and returns the chosen account's ID token,
 * or null if the user backs out.
 */
export async function pickGoogleAccount(): Promise<string | null> {
  if (!GOOGLE_CONFIG.webClientId) {
    throw new Error("Google sign-in isn't set up: GOOGLE_WEB_CLIENT_ID is missing from .env.");
  }
  configure();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Forget the last account so the chooser always appears.
    await GoogleSignin.signOut().catch(() => undefined);
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    if (!response.data.idToken) throw new Error(t("Google didn't return a sign-in token. Please try again."));
    return response.data.idToken;
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error(t('Google sign-in needs Google Play Services on this phone.'));
      }
      // Android's DEVELOPER_ERROR: this app's package + signing key aren't
      // registered with Fazl's Google project yet.
      if (String(e.code) === '10' || /DEVELOPER_ERROR/i.test(e.message)) {
        throw new Error(t("Google sign-in isn't set up for Seller Central yet. Log in with email and password for now."));
      }
    }
    throw e;
  }
}

/** So the next Google sign-in asks which account again. */
export async function forgetGoogleAccount(): Promise<void> {
  if (!configured) return;
  await GoogleSignin.signOut().catch(() => undefined);
}
