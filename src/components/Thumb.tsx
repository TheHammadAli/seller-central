import { LucideIcon, Package } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors, themedStyles } from '../theme';

interface Props {
  uri?: string;
  size?: number;
  icon?: LucideIcon;
  radius?: number;
}

/** A product or post picture, or a tinted box with an icon when there is none. */
export function Thumb({ uri, size = 56, icon: Icon = Package, radius = 12 }: Props) {
  const box = { width: size, height: size, borderRadius: radius };
  if (uri) {
    return <Image source={{ uri }} style={[styles.image, box]} />;
  }
  return (
    <View style={[styles.empty, box]}>
      <Icon size={size * 0.42} color={colors.primary} strokeWidth={1.6} />
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  image: { backgroundColor: colors.divider },
  empty: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
}));
