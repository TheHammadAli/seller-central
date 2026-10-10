import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, themedStyles } from '../theme';

interface Props {
  children: React.ReactNode;
  /** Sits above the content, outside the scroll. */
  header?: React.ReactNode;
  /** Pinned below the content, e.g. a Save button. */
  footer?: React.ReactNode;
  /** False when the screen scrolls itself (a FlatList). */
  scroll?: boolean;
  padded?: boolean;
  /** Tab screens leave the bottom inset to the tab bar. */
  bottomInset?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
}

export function Screen({
  children,
  header,
  footer,
  scroll = true,
  padded = true,
  bottomInset = true,
  refreshing,
  onRefresh,
  contentStyle,
  background = colors.background,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottom = bottomInset ? insets.bottom : 0;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom: (footer ? spacing.lg : spacing.xl) + (footer ? 0 : bottom) },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <>
      <View style={[styles.flex, padded && styles.padded, contentStyle]}>
        {children}
      </View>
      {footer ? null : <View style={{ height: bottom }} />}
    </>
  );

  return (
    <View style={[styles.flex, { backgroundColor: background, paddingTop: insets.top }]}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: spacing.md + bottom }]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
  },
}));
