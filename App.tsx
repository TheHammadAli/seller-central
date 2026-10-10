import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  NavigationState,
} from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PushHandler } from './src/components/PushHandler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RootStackParamList } from './src/navigation/types';
import { SplashScreen } from './src/screens/splash/SplashScreen';
import { AppearanceProvider, useAppearance } from './src/state/AppearanceContext';
import { AuthProvider } from './src/state/AuthContext';
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

function Root() {
  const { scheme } = useAppearance();
  const [splash, setSplash] = useState(true);
  const hideSplash = useCallback(() => setSplash(false), []);
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
        {/* On top while the app underneath gets ready, then fades out. */}
        {splash ? <SplashScreen onDone={hideSplash} /> : null}
      </AuthProvider>
    </>
  );
}

export default App;
