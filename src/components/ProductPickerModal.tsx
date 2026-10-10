import { Search, X } from 'lucide-react-native';
import { ChevronForward } from './Chevrons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listShopProducts } from '../api/shopContent';
import { FEATURES } from '../config';
import { useAuth } from '../state/AuthContext';
import { colors, fonts, radius, spacing, themedStyles } from '../theme';
import { Product } from '../types/models';
import { totalStock } from '../utils/products';
import { AppText } from './AppText';
import { PriceTag } from './PriceTag';
import { Thumb } from './Thumb';
import { t } from '../i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  title?: string;
  /** A line under the title saying what the choice is for. */
  subtitle?: string;
  /** Only the products this allows, e.g. ones with a price for a sale. */
  only?: (product: Product) => boolean;
  /** Shown when no product qualifies. */
  emptyText?: string;
}

/** Choose one of the shop's products (to tag in a video, or to advertise). */
export function ProductPickerModal({
  visible,
  onClose,
  onSelect,
  title = t('Choose a product'),
  subtitle,
  only,
  emptyText,
}: Props) {
  const insets = useSafeAreaInsets();
  const shopId = useAuth().seller?.shop?.id;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // The active shop's own listings that customers can see (not hidden ones).
  useEffect(() => {
    if (!visible || !shopId) return;
    setQuery('');
    setError(null);
    setProducts(null);
    listShopProducts(shopId).then(list => setProducts(list.filter(p => p.available)), e => {
      setError(e instanceof Error ? e.message : t("Couldn't load your products"));
      setProducts([]);
    });
  }, [visible, shopId]);

  // Every word typed must appear in the product's name or category, in any
  // order and any case: "black shoes" finds "Shoes · Premium Black Loafers".
  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (products ?? []).filter(p => {
      if (only && !only(p)) return false;
      const text = `${p.title} ${p.category ?? ''}`.toLowerCase();
      return words.every(w => text.includes(w));
    });
  }, [products, query, only]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      {/* A page sheet on iPhone sits below the status bar by itself; Android's
          full-screen modal starts under it, so it is cleared there. */}
      <View
        style={[
          styles.wrap,
          {
            paddingTop: Platform.OS === 'ios' ? spacing.lg : insets.top + spacing.md,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.head}>
          <View style={styles.flex}>
            <AppText variant="heading">{title}</AppText>
            {subtitle ? (
              <AppText variant="caption" color={colors.textMuted} style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel={t('Close')}>
            <X size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.search}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('Search your products')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t('Clear search')}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {products === null ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={p => p.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <AppText color={colors.textMuted} align="center" style={styles.loading}>
                {error ?? (query ? t('No products match "{query}"', { query }) : emptyText ?? t('This shop has no products yet.'))}
              </AppText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <Thumb uri={item.images[0]} size={60} />
                <View style={styles.flex}>
                  <AppText variant="bodyBold" numberOfLines={2}>
                    {item.title}
                  </AppText>
                  <PriceTag product={item} />
                  {FEATURES.stock ? (
                    <AppText variant="caption" color={colors.textMuted}>
                      {totalStock(item)} in stock
                    </AppText>
                  ) : item.category ? (
                    <AppText variant="caption" color={colors.textMuted}>
                      {item.category}
                    </AppText>
                  ) : null}
                </View>
                <ChevronForward size={20} color={colors.textSubtle} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}


const styles = themedStyles(() => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  subtitle: { marginTop: 2 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  search: {
    marginHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  loading: { marginTop: spacing.xxl },
}));
