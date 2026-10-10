import { Check, Plus, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, TextField } from '../../components';
import { colors, fonts, radius, spacing, themedStyles } from '../../theme';
import { allowsMultipleValues, canAddCustomValue, FormParameter } from '../../utils/categoryParameters';
import { t } from '../../i18n';

/**
 * Pick the value(s) for a category detail (e.g. Make), as in the Fazl app:
 * search the category's values, and — following admin's settings for the
 * detail — pick one or several, add one that isn't listed, or leave an
 * optional one empty.
 */
export function ParameterValueSheet({
  parameter,
  onClose,
  onSave,
}: {
  parameter: FormParameter | null;
  onClose: () => void;
  onSave: (values: string[]) => void;
}) {
  const insets = useSafeAreaInsets();
  // Admin's settings for the parameter, as in the Fazl app.
  const multiple = allowsMultipleValues(parameter);
  const canAddCustom = canAddCustomValue(parameter);
  const optional = !!parameter?.isOptional;
  const [selected, setSelected] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!parameter) return;
    setSelected(allowsMultipleValues(parameter) ? parameter.variants : parameter.variants.slice(0, 1));
    setAdded(parameter.variants.filter(v => !parameter.availableValues.includes(v)));
    setQuery('');
  }, [parameter]);

  const options = useMemo(() => {
    const all = [...(parameter?.availableValues ?? []), ...added];
    return all.filter((v, i) => v && all.indexOf(v) === i);
  }, [parameter, added]);
  const q = query.trim();
  const shown = q ? options.filter(v => v.toLowerCase().includes(q.toLowerCase())) : options;
  // The seller's own value, only where admin allows it.
  const canAdd = canAddCustom && !!q && !options.some(v => v.toLowerCase() === q.toLowerCase());

  // Several values: a row toggles. One: a row replaces it (tapping it again clears an optional one).
  const toggle = (value: string) =>
    setSelected(prev =>
      multiple
        ? prev.includes(value)
          ? prev.filter(v => v !== value)
          : [...prev, value]
        : optional && prev.includes(value)
        ? []
        : [value],
    );

  const addTyped = () => {
    if (!canAdd) return;
    setAdded(a => [...a, q]);
    setSelected(prev => (multiple ? [...prev, q] : [q]));
    setQuery('');
  };

  const confirm = () => {
    const values = selected.length ? selected : canAdd ? [q] : [];
    // A required parameter needs a value; an optional one may be left empty.
    if (!values.length && !optional) {
      Alert.alert(parameter?.name ?? '', t('Please select a value'));
      return;
    }
    onSave(values);
  };

  return (
    <Modal visible={!!parameter} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.head}>
            <AppText variant="heading" style={styles.flex} numberOfLines={1}>
              {parameter?.name}
            </AppText>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('Close')}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.search}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={canAddCustom ? t('Search or add a value') : t('Search values')}
              placeholderTextColor={colors.textSubtle}
              style={styles.searchInput}
              returnKeyType="done"
              onSubmitEditing={addTyped}
            />
          </View>
          {multiple ? (
            <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
              {t('You can choose more than one')}
            </AppText>
          ) : null}
          <FlatList
            data={shown}
            keyExtractor={v => v}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListHeaderComponent={
              canAdd ? (
                <Pressable onPress={addTyped} style={styles.row}>
                  <Plus size={18} color={colors.primary} />
                  <AppText color={colors.primary} style={styles.flex}>
                    Add “{q}”
                  </AppText>
                </Pressable>
              ) : undefined
            }
            ListEmptyComponent={
              canAdd ? undefined : (
                <AppText color={colors.textMuted} align="center" style={styles.empty}>
                  {t('No results found')}
                </AppText>
              )
            }
            renderItem={({ item }) => {
              const on = selected.includes(item);
              return (
                <Pressable onPress={() => toggle(item)} style={styles.row}>
                  <AppText style={styles.flex} variant={on ? 'bodyBold' : 'body'}>
                    {item}
                  </AppText>
                  {on ? <Check size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
          <Button title={t('Confirm')} onPress={confirm} />
        </View>
      </View>
    </Modal>
  );
}

/**
 * "Add Details" from the Fazl app: the seller's own detail, a name and one or
 * more values (e.g. Brand: Levis).
 */
export function AddDetailsSheet({
  visible,
  editing,
  onClose,
  onSave,
  onRemove,
}: {
  visible: boolean;
  editing: FormParameter | null;
  onClose: () => void;
  onSave: (detail: { name: string; values: string[] }) => void;
  onRemove: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [values, setValues] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(editing?.name ?? '');
    setValues(editing?.variants ?? []);
    setDraft('');
  }, [visible, editing]);

  const addDraft = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) setValues(list => [...list, v]);
    setDraft('');
  };

  const save = () => {
    const all = draft.trim() && !values.includes(draft.trim()) ? [...values, draft.trim()] : values;
    if (!name.trim() || !all.length) {
      Alert.alert(t('Enter details'), t('Please enter a parameter name and at least one value'));
      return;
    }
    onSave({ name: name.trim(), values: all });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.head}>
            <AppText variant="heading" style={styles.flex}>
              {t('Enter details')}
            </AppText>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('Close')}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          <TextField label={t('Name')} value={name} onChangeText={setName} placeholder={t('e.g Brand')} maxLength={40} />
          <TextField
            label={t('Value')}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('e.g Levis')}
            maxLength={60}
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={addDraft}
            right={
              <Pressable onPress={addDraft} hitSlop={8}>
                <AppText variant="label" color={colors.primary}>
                  {t('Add more')}
                </AppText>
              </Pressable>
            }
          />
          {values.length ? (
            <View style={styles.chips}>
              {values.map(v => (
                <View key={v} style={styles.chip}>
                  <AppText variant="label" color={colors.primary}>
                    {v}
                  </AppText>
                  <Pressable onPress={() => setValues(list => list.filter(x => x !== v))} hitSlop={8}>
                    <X size={14} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.buttons}>
            {editing ? <Button title={t('Remove')} variant="danger" flex onPress={onRemove} /> : null}
            <Button title={editing ? t('Update') : t('Add')} flex onPress={save} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  hint: { marginBottom: spacing.sm },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  search: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  list: { flexGrow: 0, maxHeight: 360, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  empty: { paddingVertical: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 30,
  },
  buttons: { flexDirection: 'row', gap: spacing.md },
}));
