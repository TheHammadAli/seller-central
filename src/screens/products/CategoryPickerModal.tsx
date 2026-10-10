import { LayoutGrid } from 'lucide-react-native';
import { ChevronBack, ChevronForward } from '../../components/Chevrons';
import React from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShopCategory } from '../../api/shopContent';
import { AppText } from '../../components';
import { colors, spacing, themedStyles } from '../../theme';
import { t } from '../../i18n';

/**
 * The Fazl app's "Category" list (Native-fazl-app CategoriesScreen): each
 * category with its icon in a light teal circle, its name and an arrow.
 */
export function CategoryPickerModal({
  visible,
  categories,
  selectedId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  categories: ShopCategory[];
  selectedId: string;
  onClose: () => void;
  onSelect: (category: ShopCategory) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('Back')}>
            <ChevronBack size={26} color={colors.text} />
          </Pressable>
          <AppText variant="heading">{t('Category')}</AppText>
        </View>
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <AppText color={colors.textMuted} align="center" style={styles.empty}>
              {t('No categories found')}
            </AppText>
          }
          renderItem={({ item }) => {
            const icon = typeof item.icon === 'string' ? item.icon.trim() : '';
            const selected = item.id === selectedId;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              >
                <View style={styles.iconCircle}>
                  {icon ? (
                    <Image source={{ uri: icon }} style={styles.icon} resizeMode="contain" />
                  ) : (
                    <LayoutGrid size={18} color={colors.primary} />
                  )}
                </View>
                <AppText
                  style={styles.name}
                  variant={selected ? 'bodyBold' : 'body'}
                  color={selected ? colors.primary : colors.text}
                >
                  {item.name}
                </AppText>
                <ChevronForward size={20} color={colors.textSubtle} />
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = themedStyles(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  list: { paddingHorizontal: 20, paddingVertical: 20 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  pressed: { opacity: 0.7 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: { width: 22, height: 22 },
  name: { flex: 1, fontSize: 16 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
  empty: { marginTop: spacing.xxl },
}));
