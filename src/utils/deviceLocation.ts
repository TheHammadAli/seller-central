import Geolocation from '@react-native-community/geolocation';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { LatLng } from '../api/shopSetup';

/** Why the phone's location couldn't be read. */
export type LocationProblem = 'denied' | 'blocked' | 'off' | 'timeout';

export class LocationError extends Error {
  constructor(readonly reason: LocationProblem) {
    super(`location ${reason}`);
  }
}

const LOCATE_TIMEOUT_MS = 15000;
const RECENT_FIX_MS = 60000;

async function androidPermission(): Promise<'granted' | 'denied' | 'blocked'> {
  const { ACCESS_FINE_LOCATION: FINE, ACCESS_COARSE_LOCATION: COARSE } = PermissionsAndroid.PERMISSIONS;
  if (await PermissionsAndroid.check(COARSE)) return 'granted';
  try {
    const results = await PermissionsAndroid.requestMultiple([FINE, COARSE]);
    const { GRANTED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;
    if (results[FINE] === GRANTED || results[COARSE] === GRANTED) return 'granted';
    if (results[FINE] === NEVER_ASK_AGAIN || results[COARSE] === NEVER_ASK_AGAIN) return 'blocked';
    return 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Where the phone is, asking for permission first — the Fazl app's
 * getDeviceLocation (Native-fazl-app utils/currentLocation). Rejects with a
 * LocationError saying why not.
 */
export async function getDeviceLocation(): Promise<LatLng> {
  if (Platform.OS === 'android') {
    const permission = await androidPermission();
    if (permission !== 'granted') throw new LocationError(permission);
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      error => {
        if (error?.code === 1) reject(new LocationError(Platform.OS === 'ios' ? 'blocked' : 'denied'));
        else if (error?.code === 2) reject(new LocationError('off'));
        else reject(new LocationError('timeout'));
      },
      { enableHighAccuracy: false, timeout: LOCATE_TIMEOUT_MS, maximumAge: RECENT_FIX_MS },
    );
  });
}

/** Sends the user to where the location can be turned on or allowed. */
export function openLocationSettings(reason: LocationProblem) {
  if (Platform.OS === 'android' && reason === 'off') {
    return Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => Linking.openSettings());
  }
  return Linking.openSettings();
}
