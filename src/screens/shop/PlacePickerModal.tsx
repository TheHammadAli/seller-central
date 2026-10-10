import { MapPin, Plus } from 'lucide-react-native';
import { ChevronBack } from '../../components/Chevrons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceOption } from '../../api/shopSetup';
import { AppText, TextField } from '../../components';
import { colors, spacing, themedStyles } from '../../theme';
import { t } from '../../i18n';

/**
 * The Fazl app's City / Area field (Native-fazl-app LocationPickerField): a
 * list to choose from before anything is typed, narrowed as you type, plus —
 * when `search` is given — places found for what was typed. With
 * `allowCustom` the typed text itself can be used, for a small town the lists
 * don't know the areas of.
 */
export function PlacePickerModal({
  visible,
  title,
  placeholder,
  options,
  loading,
  search,
  allowCustom,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  options: PlaceOption[];
  loading?: boolean;
  /** Should keep one identity across renders (useCallback). */
  search?: (query: string) => Promise<PlaceOption[]>;
  allowCustom?: boolean;
  onClose: () => void;
  onSelect: (option: PlaceOption) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<PlaceOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const typed = query.trim();

  // Opens empty each time.
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setFound(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!search || typed.length < 2) {
      setFound(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      search(typed)
        .then(rows => !cancelled && setFound(rows))
        .catch(() => !cancelled && setFound([]))
        .finally(() => !cancelled && setSearching(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typed, search]);

  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const matching = typed
    ? options.filter(o => o.name.toLowerCase().includes(typed.toLowerCase()))
    : options;
  // The known ones that match first, then what the search found that isn't already listed.
  const shown = found
    ? [...matching, ...found.filter(f => !matching.some(m => same(m.name, f.name)))]
    : matching;
  const custom = allowCustom && typed && !shown.some(o => same(o.name, typed)) ? typed : null;

  const choose = (option: PlaceOption) => {
    onSelect(option);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('Back')}>
            <ChevronBack size={26} color={colors.text} />
          </Pressable>
          <AppText variant="heading">{title}</AppText>
        </View>
        <View style={styles.search}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            right={searching ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
            style={styles.searchField}
          />
        </View>
        <FlatList
          data={shown}
          keyExtractor={(o, i) => `${o.name}|${o.subtitle ?? ''}|${i}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            custom ? (
              <Pressable
                onPress={() => choose({ name: custom, coordinates: null })}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              >
                <View style={styles.iconCircle}>
                  <Plus size={18} color={colors.primary} />
                </View>
                <AppText variant="bodyBold" color={colors.primary} style={styles.name}>
                  Use “{custom}”
                </AppText>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={styles.empty} />
            ) : custom || searching ? undefined : (
              <AppText color={colors.textMuted} align="center" style={styles.empty}>
                {t('No matches')}
              </AppText>
            )
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => choose(item)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={styles.iconCircle}>
                <MapPin size={18} color={colors.primary} />
              </View>
              <View style={styles.name}>
                <AppText style={styles.title}>{item.name}</AppText>
                {item.subtitle && item.subtitle !== item.name ? (
                  <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                    {item.subtitle}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          )}
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
  search: { paddingHorizontal: 20, paddingTop: spacing.md },
  searchField: { marginBottom: 0 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
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
  name: { flex: 1 },
  title: { fontSize: 16 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
  empty: { marginTop: spacing.xxl },
}));
