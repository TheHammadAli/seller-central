import { ImagePlus, Play, Video, X } from 'lucide-react-native';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { colors, radius, spacing, themedStyles } from '../theme';
import { AppText } from './AppText';
import { t } from '../i18n';

export interface PickedMedia {
  uri: string;
  kind: 'image' | 'video';
  /** From the gallery, for the upload (absent on media already on Fazl). */
  name?: string;
  type?: string;
  duration?: number;
  fileSize?: number;
}

/** Media already uploaded to Fazl, as opposed to picked on this phone. */
export const isRemoteMedia = (m: PickedMedia) => /^https?:\/\//i.test(m.uri);

interface Props {
  label?: string;
  hint?: string;
  value: PickedMedia[];
  onChange: (media: PickedMedia[]) => void;
  /** What can be picked. */
  accept?: 'image' | 'video' | 'both';
  maxImages?: number;
  maxVideos?: number;
  /** Longer videos are refused, e.g. 60 for a feed video. */
  maxVideoSeconds?: number;
}

const TILE = 88;

/** Picked photos/videos as tiles, with an Add tile while there is room. */
export function MediaPicker({
  label,
  hint,
  value,
  onChange,
  accept = 'image',
  maxImages = 8,
  maxVideos = 1,
  maxVideoSeconds,
}: Props) {
  const images = value.filter(m => m.kind === 'image').length;
  const videos = value.filter(m => m.kind === 'video').length;
  const roomForImages = accept !== 'video' && images < maxImages;
  const roomForVideo = accept !== 'image' && videos < maxVideos;

  const pick = async (kind: 'image' | 'video') => {
    const result = await launchImageLibrary({
      mediaType: kind === 'image' ? 'photo' : 'video',
      selectionLimit: kind === 'image' ? maxImages - images : 1,
      quality: 0.8,
      // Fazl keeps photos at 1600 px at most anyway; smaller uploads faster.
      maxWidth: 1600,
      maxHeight: 1600,
    });
    if (result.errorMessage) {
      Alert.alert(t("Couldn't open your gallery"), result.errorMessage);
      return;
    }
    const assets = result.assets ?? [];
    if (
      kind === 'video' &&
      maxVideoSeconds &&
      assets.some(a => (a.duration ?? 0) > maxVideoSeconds)
    ) {
      Alert.alert(t('Video too long'), t('Video must be {seconds} seconds or less.', { seconds: maxVideoSeconds }));
      return;
    }
    const picked = assets
      .filter(a => a.uri)
      .map(a => ({
        uri: a.uri as string,
        kind,
        name: a.fileName,
        type: a.type,
        duration: a.duration,
        fileSize: a.fileSize,
      }));
    if (picked.length) onChange([...value, ...picked]);
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {value.map((m, i) => (
          <View key={`${m.uri}-${i}`} style={styles.tile}>
            {m.kind === 'image' ? (
              <Image source={{ uri: m.uri }} style={styles.media} />
            ) : (
              <View style={[styles.media, styles.video]}>
                <Play size={26} color={colors.white} fill={colors.white} />
              </View>
            )}
            {i === 0 && m.kind === 'image' ? (
              <View style={styles.cover}>
                <AppText variant="small" color={colors.white}>
                  {t('Cover')}
                </AppText>
              </View>
            ) : null}
            <Pressable onPress={() => remove(i)} style={styles.remove} hitSlop={8} accessibilityLabel={t('Remove')}>
              <X size={14} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {roomForImages ? (
          <Pressable onPress={() => pick('image')} style={[styles.tile, styles.add]}>
            <ImagePlus size={24} color={colors.primary} />
            <AppText variant="small" color={colors.primary}>
              {t('Add photo')}
            </AppText>
          </Pressable>
        ) : null}
        {roomForVideo ? (
          <Pressable onPress={() => pick('video')} style={[styles.tile, styles.add]}>
            <Video size={24} color={colors.primary} />
            <AppText variant="small" color={colors.primary}>
              {t('Add video')}
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
      {hint ? (
        <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm },
  row: { gap: spacing.sm },
  tile: { width: TILE, height: TILE, borderRadius: radius.md, overflow: 'hidden' },
  media: { width: TILE, height: TILE },
  video: { backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  add: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cover: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,119,129,0.85)',
    alignItems: 'center',
    paddingVertical: 2,
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { marginTop: spacing.sm },
}));
