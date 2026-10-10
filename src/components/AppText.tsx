import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { colors, TextVariant, textVariants } from '../theme';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}

export function AppText({
  variant = 'body',
  color = colors.text,
  align,
  style,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      style={[textVariants[variant], { color, textAlign: align }, style]}
    />
  );
}
