import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  NavigationState,
} from '@react-navigation/native';
import React, { useMemo, useRef } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PushHandler } from './src/components/PushHandler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RootStackParamList } from './src/navigation/types';
import { SplashScreen } from './src/screens/splash/SplashScreen';
import { AppearanceProvider, useAppearance } from './src/state/AppearanceContext';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { colors, ColorScheme } from './src/theme';

/** React Navigation's own colours, from the current palette. */
function navigationTheme(scheme: ColorScheme) {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };
}

/** Lets a tapped push notification open the order it's about. */
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function App() {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <Root />
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}

/** How long the splash on logging out stays at least. */
const LOGOUT_SPLASH_MS = 2500;

/**
 * On top while the app underneath gets ready, then fades out: at start
 * (Home's data loads behind it) and while logging out (the login screen is
 * underneath when it fades) — then just the logo and the loading dots, no
 * text. Each one starts afresh.
 */
function SplashOverlay() {
  const { splash, splashDone } = useAuth();
  if (!splash) return null;
  const loggingOut = splash.reason === 'logout';
  return (
    <SplashScreen
      key={splash.id}
      until={splash.until}
      minShowMs={loggingOut ? LOGOUT_SPLASH_MS : undefined}
      plain={loggingOut}
      onDone={() => splashDone(splash.id)}
    />
  );
}

function Root() {
  const { scheme } = useAppearance();
  // Where the seller is, so a change of light / dark keeps them there.
  const navState = useRef<NavigationState | undefined>(undefined);
  const theme = useMemo(() => navigationTheme(scheme), [scheme]);

  return (
    <>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        {/* Drawn again when the scheme changes, so every screen takes the new
            colours; the screen that was open stays open. */}
        <NavigationContainer
          key={scheme}
          ref={navigationRef}
          theme={theme}
          initialState={navState.current}
          onStateChange={state => {
            navState.current = state;
          }}
        >
          <RootNavigator />
        </NavigationContainer>
        <PushHandler navigationRef={navigationRef} />
        <SplashOverlay />
      </AuthProvider>
    </>
  );
}

export default App;
