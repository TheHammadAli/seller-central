import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { onPushTapped, onPushWhileOpen, PushMessage, startPush } from '../push';
import { useAuth } from '../state/AuthContext';
import { colors, radius, shadow, spacing, themedStyles } from '../theme';
import { AppText } from './AppText';

type Props = { navigationRef: NavigationContainerRefWithCurrent<RootStackParamList> };

/** Where a notification leads: its order, else the notifications list. */
type Target = { orderId?: string };

const targetOf = (message: PushMessage): Target => {
  const orderId = message.data?.orderId;
  return typeof orderId === 'string' && orderId ? { orderId } : {};
};

/**
 * Push notifications while logged in: registers this phone for them, shows a
 * banner for one that arrives while the app is open, and opens the order a
 * tapped notification is about (once the seller's screens are there).
 */
export function PushHandler({ navigationRef }: Props) {
  const { seller } = useAuth();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<{ title: string; body: string; target: Target } | null>(null);
  const slide = useRef(new Animated.Value(0)).current;
  const pending = useRef<Target | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedIn = !!seller?.shop;

  const open = useCallback(
    (target: Target) => {
      const nav = navigationRef.current;
      const routes = nav?.getRootState()?.routeNames ?? [];
      // Not logged in yet, or the app is still starting: go there once it can.
      if (!nav || !loggedIn || !routes.includes('OrderDetail')) {
        pending.current = target;
        return;
      }
      pending.current = null;
      if (target.orderId) nav.navigate('OrderDetail', { orderId: target.orderId });
      else nav.navigate('Notifications');
    },
    [navigationRef, loggedIn],
  );

  // Registered for push once per login.
  useEffect(() => {
    if (seller?.id) startPush();
  }, [seller?.id]);

  // A tapped notification, and the one that opened the app.
  useEffect(() => onPushTapped(message => open(targetOf(message))), [open]);

  // Logged in now: carry out a tap that came before.
  useEffect(() => {
    if (!loggedIn || !pending.current) return;
    const timer = setTimeout(() => pending.current && open(pending.current), 300);
    return () => clearTimeout(timer);
  }, [loggedIn, open]);

  const hide = useCallback(() => {
    Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setBanner(null));
  }, [slide]);

  // One that arrives while the app is open: the phone doesn't show it itself.
  useEffect(
    () =>
      onPushWhileOpen(message => {
        if (!loggedIn) return;
        setBanner({
          title: message.notification?.title ?? '',
          body: message.notification?.body ?? '',
          target: targetOf(message),
        });
        Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }).start();
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(hide, 5000);
      }),
    [loggedIn, slide, hide],
  );

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  if (!banner) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + spacing.sm,
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
        },
      ]}
    >
      <Pressable
        style={styles.banner}
        onPress={() => {
          hide();
          open(banner.target);
        }}
        accessibilityRole="button"
      >
        <View style={styles.icon}>
          <Bell size={18} color={colors.white} />
        </View>
        <View style={styles.text}>
          {banner.title ? (
            <AppText variant="bodyBold" numberOfLines={1}>
              {banner.title}
            </AppText>
          ) : null}
          {banner.body ? (
            <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
              {banner.body}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.md, zIndex: 100 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  text: { flex: 1 },
}));
