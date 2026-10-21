import { RotateCcw, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { AppText } from '../../components';
import { RootScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { t } from '../../i18n';

/**
 * Plays a video full screen — a posted one from Fazl, or one just picked —
 * with the phone's controls (play / pause, seek), the whole of it in view,
 * landscape or portrait. It starts playing at once.
 */
export function VideoPlayerScreen({ navigation, route }: RootScreenProps<'VideoPlayer'>) {
  const { uri, title } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // A new key starts the player afresh on "Try again".
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setAttempt(a => a + 1);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      {failed ? (
        <View style={styles.center}>
          <AppText color={colors.white} align="center">
            {t("This video couldn't be played.")}
          </AppText>
          <Pressable onPress={retry} style={styles.retry} accessibilityRole="button">
            <RotateCcw size={16} color={colors.white} />
            <AppText variant="label" color={colors.white}>
              {t('Try again')}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <Video
          key={attempt}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          controls
          onLoad={() => setLoading(false)}
          onBuffer={({ isBuffering }) => setLoading(isBuffering)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      )}
      {loading && !failed ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      ) : null}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={navigation.goBack}
          style={styles.close}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        >
          <X size={22} color={colors.white} />
        </Pressable>
        {title ? (
          <AppText color={colors.white} numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

// Always dark, whatever the app's theme: a video plays on black.
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
});
