import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from './AppText';

// Apple's logo (Simple Icons, CC0).
const APPLE_LOGO =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';
// Apple's white button: black logo and title on white, in light and dark mode.
const INK = '#000000';
const PAPER = '#FFFFFF';

/**
 * "Continue with Apple", drawn here rather than with Apple's own button, so
 * its title matches the "Continue with Google" beside it: Apple's button picks
 * its own, bigger, font from its height. Apple allows a custom Sign in with
 * Apple button like this (its logo and title, white with black). It takes the
 * Google button's own box and text styles; a light outline keeps it visible on
 * a white screen.
 */
export function AppleSignInButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <TouchableOpacity
      style={[style, styles.white, disabled && !loading && styles.dimmed]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={INK} />
      ) : (
        <>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d={APPLE_LOGO} fill={INK} />
          </Svg>
          <AppText style={[textStyle, styles.ink]} numberOfLines={1}>
            {title}
          </AppText>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  white: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: '#D9D9D9',
  },
  ink: { color: INK },
  dimmed: { opacity: 0.6 },
});
