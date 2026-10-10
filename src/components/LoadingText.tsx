import React, { useEffect, useState } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { TextVariant } from '../theme';
import { AppText } from './AppText';

const STEP_MS = 400;

/**
 * "Creating..." with the dots appearing one by one, for a button while it
 * works. The three dots always take their room (the hidden ones are
 * transparent), so the text doesn't shift as they come and go.
 */
export function LoadingText({
  text,
  color,
  variant,
  style,
}: {
  text: string;
  color: string;
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setShown(n => (n + 1) % 4), STEP_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <AppText variant={variant} style={style} color={color} accessibilityLabel={text}>
      {text}
      {[0, 1, 2].map(i => (
        <AppText key={i} variant={variant} style={style} color={i < shown ? color : 'transparent'}>
          .
        </AppText>
      ))}
    </AppText>
  );
}
