import { RotateCcw, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { WebView } from 'react-native-webview';
import { SocialVideo } from '../../types/models';
import { AppText } from '../../components';
import { RootScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { t } from '../../i18n';

/**
 * Plays a video full screen — a posted one from Fazl, or one just picked —
 * with the phone's controls (play / pause, seek), the whole of it in view,
 * landscape or portrait. It starts playing at once.
 *
 * A video posted by link (`embed`) plays in its platform's own player instead
 * (YouTube, TikTok, Instagram, Facebook), in a page served as fazlapp.com —
 * YouTube won't play an embed with no site behind it.
 */
export function VideoPlayerScreen({ navigation, route }: RootScreenProps<'VideoPlayer'>) {
  const { uri, title, embed } = route.params;
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
      {embed ? (
        <WebView
          source={{ html: embedPage(embed), baseUrl: 'https://fazlapp.com' }}
          style={styles.web}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          setSupportMultipleWindows={false}
          onLoadEnd={() => setLoading(false)}
        />
      ) : failed ? (
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

/** The platform's player, told to start by itself where it allows that. */
function embedPage(embed: SocialVideo): string {
  const src =
    embed.provider === 'youtube'
      ? `${embed.embedUrl}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
      : embed.provider === 'tiktok'
        ? `${embed.embedUrl}?autoplay=1&loop=1&music_info=0&description=0&rel=0`
        : embed.provider === 'facebook'
          ? `${embed.embedUrl}&autoplay=true`
          : embed.embedUrl;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}</style>
</head><body><iframe src="${src.replace(/"/g, '&quot;')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
}

// Always dark, whatever the app's theme: a video plays on black.
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  web: { flex: 1, backgroundColor: '#000000' },
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
