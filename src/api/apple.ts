import { Platform } from 'react-native';
import appleAuth from '@invertase/react-native-apple-authentication';
import { t } from '../i18n';

/** Sign in with Apple is offered on iPhone only (iOS 13+), as in the Fazl app. */
export const isAppleSignInAvailable = Platform.OS === 'ios' && appleAuth.isSupported;

export interface AppleIdentity {
  identityToken: string;
  /** Only on the very first sign-in with this Apple ID. */
  fullName: { givenName: string | null; familyName: string | null };
}

/**
 * Shows Apple's sign-in sheet; resolves with what the backend needs to verify
 * it, or null if the user closed the sheet.
 */
export async function pickAppleIdentity(): Promise<AppleIdentity | null> {
  try {
    const credential = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
    if (!credential.identityToken) throw new Error(t("Apple didn't return a sign-in token. Please try again."));
    return {
      identityToken: credential.identityToken,
      fullName: {
        givenName: credential.fullName?.givenName ?? null,
        familyName: credential.fullName?.familyName ?? null,
      },
    };
  } catch (e) {
    if ((e as { code?: string })?.code === appleAuth.Error.CANCELED) return null;
    throw e;
  }
}
