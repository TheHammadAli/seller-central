import React from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import ButtonBackground from '../assets/images/button-background.png';
import { colors, fonts, themedStyles } from '../theme';
import { AppText } from './AppText';
import { LoadingText } from './LoadingText';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** While loading, this text with animated dots ("Logging in...") instead of a spinner. */
  loadingText?: string;
  style?: StyleProp<ViewStyle>;
}

/** The Fazl app's main button (PrimaryButton): teal with the doodle pattern. */
export function DoodleButton({ title, onPress, disabled, loading, loadingText, style }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      // Busy with its own work it stays in full colour; only a button that
      // can't be used yet is dimmed.
      style={[styles.button, disabled && !loading && styles.disabled, style]}
    >
      <ImageBackground
        source={ButtonBackground}
        resizeMode="cover"
        imageStyle={styles.image}
        style={styles.background}
      >
        {loading && loadingText ? (
          <LoadingText text={loadingText} color={colors.white} style={styles.text} />
        ) : loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <AppText style={styles.text}>{title}</AppText>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    minHeight: 56,
    elevation: 3,
  },
  background: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  image: { borderRadius: 12 },
  text: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.white },
  disabled: { opacity: 0.6 },
}));
