import { LocateFixed, MapPin } from 'lucide-react-native';
import { ChevronBack } from '../../components/Chevrons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LatLng, PlaceOption, reverseGeocode, searchPlaces } from '../../api/shopSetup';
import { AppText, Button, TextField } from '../../components';
import { colors, radius, shadow, spacing, themedStyles } from '../../theme';
import { getDeviceLocation, LocationError, openLocationSettings } from '../../utils/deviceLocation';
import { t } from '../../i18n';

/** Roughly the centre of Pakistan, for a map opened with nothing to start from (as in the Fazl app). */
const PAKISTAN_CENTRE = { latitude: 30.3753, longitude: 69.3451, latitudeDelta: 10, longitudeDelta: 10 };
const PICKED_DELTA = 0.02;

export interface PinnedPlace {
  at: LatLng;
  /** The address at the pin, e.g. "Shop 12, Main Boulevard, Gulberg, Lahore". */
  address: string;
  /** The city and area the pin is in, when the map knows them. */
  city: string;
  area: string;
}

/** 'checking' while the phone's location is asked for, 'on' once it is, else why not. */
type LocationState = 'checking' | 'on' | 'off' | 'denied' | 'blocked';

/** What covers the map while the location isn't on — the Fazl app's texts. */
const GATE = {
  off: {
    title: t('Turn on your location'),
    message: t("Your phone's location must be on to choose a place on the map."),
    action: t('Turn on location'),
  },
  denied: {
    title: t('Allow location access'),
    message: t('Allow location access to choose a place on the map.'),
    action: t('Allow location'),
  },
  blocked: {
    title: t('Allow location access'),
    message: t('Location is off for this app. Turn it on in Settings to choose a place on the map.'),
    action: t('Open Settings'),
  },
};

const toMap = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

/**
 * The Fazl app's "Store Pin location" map (Native-fazl-app
 * MapLocationPickerModal): tap the map, search a place or use where the phone
 * is, and the pin's address, city and area come from the backend's
 * reverse-geocoding.
 *
 * As in the Fazl app, a place can only be chosen with the phone's location on:
 * until it is, the map is covered by a screen asking to turn it on (or allow
 * it); it then opens where the phone is, with the pin there when none was
 * chosen before.
 */
export function MapPickerModal({
  visible,
  initial,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  /** The pin chosen before, when reopening. */
  initial: PinnedPlace | null;
  onClose: () => void;
  onConfirm: (place: PinnedPlace) => void;
}) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [place, setPlace] = useState({ address: '', city: '', area: '' });
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>('checking');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceOption[]>([]);
  const [searching, setSearching] = useState(false);
  // Each pin's lookup and each location check gets a number, so an older
  // answer arriving late (or after closing) is dropped.
  const lookup = useRef(0);
  const checkRun = useRef(0);
  // Set when the user is sent to Settings, so coming back checks again. Only
  // then: on Android the permission dialog itself also sends the app to the
  // background and back, and checking again on that would ask in a loop.
  const sentToSettings = useRef(false);
  const pinRef = useRef(pin);
  pinRef.current = pin;

  const resolve = useCallback(async (at: LatLng) => {
    const run = ++lookup.current;
    setResolving(true);
    try {
      const found = await reverseGeocode(at);
      if (run === lookup.current) setPlace(found);
    } catch {
      if (run === lookup.current) setPlace({ address: '', city: '', area: '' });
    } finally {
      if (run === lookup.current) setResolving(false);
    }
  }, []);

  const dropPin = useCallback(
    (at: LatLng, move: boolean) => {
      setPin(at);
      if (move) {
        mapRef.current?.animateToRegion({ ...toMap(at), latitudeDelta: PICKED_DELTA, longitudeDelta: PICKED_DELTA }, 400);
      }
      resolve(at);
    },
    [resolve],
  );

  const checkLocation = useCallback(() => {
    const run = ++checkRun.current;
    setLocationState('checking');
    getDeviceLocation()
      .then(at => {
        if (run !== checkRun.current) return;
        setLocationState('on');
        // Nothing picked yet: start from where the phone is.
        if (!pinRef.current) dropPin(at, true);
      })
      .catch(e => {
        if (run !== checkRun.current) return;
        const reason = e instanceof LocationError ? e.reason : 'off';
        // On, but no position in time (indoors): the location is on, so the
        // map opens — just without a pin to start from.
        setLocationState(reason === 'timeout' ? 'on' : reason);
      });
  }, [dropPin]);

  // Each opening starts from the pin chosen before, and checks the location again.
  useEffect(() => {
    if (!visible) {
      checkRun.current += 1;
      sentToSettings.current = false;
      return;
    }
    setQuery('');
    setResults([]);
    setPin(initial?.at ?? null);
    pinRef.current = initial?.at ?? null;
    setPlace(initial ? { address: initial.address, city: initial.city, area: initial.area } : { address: '', city: '', area: '' });
    checkLocation();
    // Only on opening and closing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Back from Settings: check again, so the map opens by itself once the
  // location was turned on there.
  useEffect(() => {
    if (!visible) return undefined;
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' && sentToSettings.current) {
        sentToSettings.current = false;
        checkLocation();
      }
    });
    return () => sub.remove();
  }, [visible, checkLocation]);

  // The search box, as in the Fazl app: places anywhere, half a second after typing stops.
  useEffect(() => {
    const typed = query.trim();
    if (!typed) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchPlaces(typed)
        .then(rows => !cancelled && setResults(rows))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setSearching(false));
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const locate = async () => {
    setLocating(true);
    try {
      dropPin(await getDeviceLocation(), true);
    } catch (e) {
      if (e instanceof LocationError && e.reason !== 'timeout') setLocationState(e.reason);
    } finally {
      setLocating(false);
    }
  };

  const gateAction = () => {
    // Refused once (Android): it can simply be asked again.
    if (locationState === 'denied') {
      checkLocation();
      return;
    }
    sentToSettings.current = true;
    openLocationSettings(locationState === 'off' ? 'off' : 'blocked');
  };

  const isOn = locationState === 'on';
  const gate = locationState === 'off' || locationState === 'denied' || locationState === 'blocked' ? GATE[locationState] : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('Back')}>
            <ChevronBack size={26} color={colors.text} />
          </Pressable>
          <AppText variant="heading">{t('Choose location on map')}</AppText>
        </View>

        <View style={styles.mapWrap}>
          {isOn ? (
            <>
              <MapView
                ref={mapRef}
                // Google Maps on Android (the Fazl app's Maps key); Apple Maps on iPhone, which needs no key.
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={StyleSheet.absoluteFill}
                initialRegion={
                  pin ? { ...toMap(pin), latitudeDelta: PICKED_DELTA, longitudeDelta: PICKED_DELTA } : PAKISTAN_CENTRE
                }
                onPress={e => {
                  Keyboard.dismiss();
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  dropPin({ lat: latitude, lng: longitude }, false);
                }}
                showsUserLocation
                showsMyLocationButton={false}
              >
                {pin ? <Marker coordinate={toMap(pin)} /> : null}
              </MapView>

              {/* Over the map, the results inside the same box: drawn after the
                  map, and within the box's bounds, so they show and take taps
                  on Android. */}
              <View style={styles.search}>
                <TextField
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('Search for a location')}
                  autoCorrect={false}
                  autoCapitalize="none"
                  right={searching ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
                  style={styles.searchField}
                />
                {results.length ? (
                  <View style={styles.results}>
                    <FlatList
                      data={results}
                      keyExtractor={(r, i) => `${r.subtitle ?? r.name}|${i}`}
                      keyboardShouldPersistTaps="always"
                      renderItem={({ item }) => (
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setQuery('');
                            setResults([]);
                            if (item.coordinates) dropPin(item.coordinates, true);
                          }}
                          style={({ pressed }) => [styles.result, pressed && styles.pressed]}
                        >
                          <AppText numberOfLines={1}>{item.subtitle ?? item.name}</AppText>
                        </Pressable>
                      )}
                    />
                  </View>
                ) : null}
              </View>

              <Pressable onPress={locate} style={styles.locate} accessibilityLabel={t('Use my current location')} disabled={locating}>
                {locating ? <ActivityIndicator color={colors.primary} /> : <LocateFixed size={22} color={colors.primary} />}
              </Pressable>
            </>
          ) : (
            <View style={styles.gate}>
              {gate ? (
                <>
                  <LocateFixed size={40} color={colors.primary} />
                  <AppText variant="subheading" align="center" style={styles.gateTitle}>
                    {gate.title}
                  </AppText>
                  <AppText color={colors.textMuted} align="center">
                    {gate.message}
                  </AppText>
                  <Button title={gate.action} onPress={gateAction} style={styles.gateButton} />
                  {locationState !== 'denied' ? (
                    <Button title={t('Try Again')} variant="ghost" onPress={checkLocation} />
                  ) : null}
                </>
              ) : (
                <>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <AppText color={colors.textMuted} align="center" style={styles.gateTitle}>
                    {t('Finding your location…')}
                  </AppText>
                </>
              )}
            </View>
          )}
        </View>

        <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.address}>
            <MapPin size={18} color={colors.primary} />
            <AppText style={styles.flex} color={pin && isOn ? colors.text : colors.textMuted} numberOfLines={2}>
              {!pin || !isOn
                ? t('Tap anywhere on the map to choose a location')
                : resolving
                ? t('Finding the address…')
                : place.address || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}
            </AppText>
          </View>
          <Button
            title={t('Confirm')}
            disabled={!pin || !isOn || resolving}
            onPress={() => {
              if (!pin || !isOn) return;
              onConfirm({ at: pin, ...place });
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  mapWrap: { flex: 1 },
  search: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    elevation: 10,
  },
  searchField: { marginBottom: 0 },
  results: {
    marginTop: spacing.xs,
    maxHeight: 240,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  result: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  pressed: { opacity: 0.7 },
  locate: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  gateTitle: { marginTop: spacing.md },
  gateButton: { alignSelf: 'stretch', marginTop: spacing.md },
  panel: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  address: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
