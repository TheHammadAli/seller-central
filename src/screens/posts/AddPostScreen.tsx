import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Clapperboard, Info, Link2, PackagePlus, Play, X } from 'lucide-react-native';
import { ChevronForward } from '../../components/Chevrons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { createVideoThumbnail } from 'react-native-compressor';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  listShopProducts,
  postShopVideo,
  postShopVideoLink,
  previewSocialVideo,
  UploadFile,
} from '../../api/shopContent';
import { AppText, Button, Card, Header, IconCircle, Screen, Segmented, TextField, Thumb } from '../../components';
import { RootScreenProps, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { Product, SocialVideo } from '../../types/models';
import { prepareVideo, VideoTooLongError } from '../../utils/videoCompression';
import { t } from '../../i18n';

/**
 * The shop's two ways to post, as on the Fazl app's shop page: a video for the
 * feed, or a product listing. Either shows up on Fazl straight away.
 */
export function AddPostScreen({ route, navigation }: RootScreenProps<'AddPost'>) {
  const [video, setVideo] = useState(route.params?.type === 'video');

  if (!video) {
    return (
      <Screen header={<Header title={t('Add post')} subtitle={t('What would you like to post?')} />}>
        <Card onPress={() => setVideo(true)} style={styles.typeCard}>
          <IconCircle icon={Clapperboard} tone="purple" size={48} />
          <View style={styles.flex}>
            <AppText variant="subheading">{t('Post a video')}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t('A short video for the Fazl feed. You can tag one of your products in it.')}
            </AppText>
          </View>
          <ChevronForward size={20} color={colors.textSubtle} />
        </Card>
        <Card onPress={() => navigation.replace('ProductForm')} style={styles.typeCard}>
          <IconCircle icon={PackagePlus} tone="primary" size={48} />
          <View style={styles.flex}>
            <AppText variant="subheading">{t('Post a product')}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t('List a product with its photos, details and price so customers can find it.')}
            </AppText>
          </View>
          <ChevronForward size={20} color={colors.textSubtle} />
        </Card>
        <View style={styles.note}>
          <Info size={16} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted} style={styles.flex}>
            {t("What you post here goes live on your shop's Fazl page straight away — no need to post it again in the Fazl app.")}
          </AppText>
        </View>
      </Screen>
    );
  }

  return <VideoPostForm canChangeType={route.params?.type !== 'video'} onChangeType={() => setVideo(false)} />;
}

const PROVIDER_NAMES: Record<SocialVideo['provider'], string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

/**
 * The Fazl app's shop "Post video" (Native-fazl-app PostVideoScreen): the video
 * is compressed as soon as it's picked, then a caption and an optional tagged
 * product — same fields, rules and messages.
 *
 * Or, as there, the link of a public YouTube, TikTok, Instagram or Facebook
 * video: checked first, then posted to play in that platform's own player once
 * the owner says it's theirs to share.
 */
function VideoPostForm({ canChangeType, onChangeType }: { canChangeType: boolean; onChangeType: () => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const shop = useAuth().seller?.shop;
  const [video, setVideo] = useState<UploadFile | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [compressing, setCompressing] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [taggedId, setTaggedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 'upload' a file, or 'link' to a video on YouTube / TikTok / Instagram / Facebook.
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [linkText, setLinkText] = useState('');
  const [checkingLink, setCheckingLink] = useState(false);
  const [linkVideo, setLinkVideo] = useState<SocialVideo | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  // The shop's own live products, for the optional tag.
  useEffect(() => {
    if (!shop) return;
    listShopProducts(shop.id)
      .then(list => setProducts(list.filter(p => p.available)))
      .catch(() => setProducts([]));
  }, [shop]);

  const pickVideo = async () => {
    if (compressing !== null || submitting) return;
    const result = await launchImageLibrary({ mediaType: 'video', selectionLimit: 1 });
    const asset = result.assets?.[0];
    if (result.didCancel || !asset?.uri) return;
    setCompressing(0);
    try {
      const ready = await prepareVideo(
        {
          uri: asset.uri,
          fileName: asset.fileName,
          type: asset.type,
          duration: asset.duration,
          fileSize: asset.fileSize,
        },
        setCompressing,
      );
      setVideo(ready);
      setThumbnail(null);
      createVideoThumbnail(ready.uri)
        .then(thumb => setThumbnail(thumb.path.startsWith('file://') ? thumb.path : `file://${thumb.path}`))
        .catch(() => setThumbnail(null));
    } catch (e) {
      Alert.alert(
        t('Error'),
        e instanceof VideoTooLongError
          ? t('Video must be 60 seconds or less.')
          : t('Could not process this video. Please try a different one.'),
      );
    } finally {
      setCompressing(null);
    }
  };

  const checkLink = async () => {
    if (checkingLink || submitting) return;
    if (!linkText.trim()) {
      Alert.alert(t('Error'), t('Paste a video link and check it first.'));
      return;
    }
    setCheckingLink(true);
    try {
      const found = await previewSocialVideo(linkText.trim());
      setLinkVideo(found);
      setRightsConfirmed(false);
      // YouTube gives the video's title: a starting caption to edit.
      if (!caption.trim() && found.title) setCaption(found.title);
    } catch (e) {
      Alert.alert(t('Error'), e instanceof Error && e.message ? e.message : t("We couldn't check this link. Please try again."));
    } finally {
      setCheckingLink(false);
    }
  };

  const submitLink = async () => {
    if (!linkVideo) {
      Alert.alert(t('Error'), t('Paste a video link and check it first.'));
      return;
    }
    if (!caption.trim()) {
      Alert.alert(t('Error'), t('Please add a caption'));
      return;
    }
    if (!rightsConfirmed) {
      Alert.alert(t('Error'), t('Please confirm you have the right to share this video.'));
      return;
    }
    if (!shop) return;
    setSubmitting(true);
    try {
      await postShopVideoLink(shop.id, {
        url: linkVideo.sourceUrl,
        caption: caption.trim(),
        taggedProductId: taggedId ?? undefined,
      });
      Alert.alert(t('Success'), t('Video posted successfully'));
      navigation.replace('Posts');
    } catch (e) {
      Alert.alert(t('Error'), e instanceof Error && e.message ? e.message : t('Failed to post video. Please try again.'));
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (compressing !== null || submitting) return;
    if (mode === 'link') {
      await submitLink();
      return;
    }
    if (!video) {
      Alert.alert(t('Error'), t('Please select a video'));
      return;
    }
    if (!caption.trim()) {
      Alert.alert(t('Error'), t('Please add a caption'));
      return;
    }
    if (!shop) return;
    setSubmitting(true);
    try {
      // The same endpoint as the Fazl app's shop "Post video".
      await postShopVideo(shop.id, { caption: caption.trim(), video, taggedProductId: taggedId ?? undefined });
      Alert.alert(t('Success'), t('Video posted successfully'));
      navigation.replace('Posts');
    } catch (e) {
      Alert.alert(t('Error'), e instanceof Error && e.message ? e.message : t('Failed to post video. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <Screen
      header={
        <Header
          title={t('Post video')}
          subtitle={shop?.name}
          right={
            canChangeType ? (
              <Pressable onPress={onChangeType} hitSlop={8}>
                <AppText variant="label" color={colors.primary}>
                  {t('Back to options')}
                </AppText>
              </Pressable>
            ) : undefined
          }
        />
      }
      footer={
        <Button
          title={submitting && mode === 'upload' ? t('Uploading video...') : t('Post video')}
          flex
          loading={submitting && mode === 'link'}
          disabled={submitting || compressing !== null || checkingLink}
          onPress={submit}
        />
      }
    >
      <View style={styles.modes}>
        <Segmented
          options={[
            { key: 'upload', label: t('Upload video') },
            { key: 'link', label: t('Paste link') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      {mode === 'link' ? (
        linkVideo ? (
          <View style={styles.linkBlock}>
            <View style={styles.linkPreview}>
              <View style={styles.linkPoster}>
                {linkVideo.thumbnailUrl ? (
                  <Image source={{ uri: linkVideo.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <AppText variant="small" color={colors.white}>
                    {PROVIDER_NAMES[linkVideo.provider]}
                  </AppText>
                )}
              </View>
              <View style={styles.flex}>
                <AppText variant="label" color={colors.primary}>
                  ▶ {PROVIDER_NAMES[linkVideo.provider]}
                </AppText>
                {linkVideo.title ? (
                  <AppText variant="bodyBold" numberOfLines={2}>
                    {linkVideo.title}
                  </AppText>
                ) : null}
                {linkVideo.authorName ? (
                  <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                    {linkVideo.authorName}
                  </AppText>
                ) : null}
                <Pressable
                  onPress={() => {
                    setLinkVideo(null);
                    setRightsConfirmed(false);
                  }}
                  hitSlop={8}
                >
                  <AppText variant="label" color={colors.primary} style={styles.linkChange}>
                    {t('Change link')}
                  </AppText>
                </Pressable>
              </View>
            </View>
            <Pressable onPress={() => setRightsConfirmed(v => !v)} style={styles.rightsRow} accessibilityRole="checkbox" accessibilityState={{ checked: rightsConfirmed }}>
              <View style={[styles.checkbox, rightsConfirmed && styles.checkboxOn]}>
                {rightsConfirmed ? <Check size={14} color={colors.white} /> : null}
              </View>
              <AppText style={styles.flex}>{t('This is my video, or I have the right to share it')}</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.linkBlock}>
            <TextField
              label={t('Video link')}
              value={linkText}
              onChangeText={setLinkText}
              placeholder={t('YouTube, TikTok, Instagram or Facebook video link')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Button
              title={t('Check link')}
              variant="outline"
              icon={Link2}
              loading={checkingLink}
              onPress={checkLink}
            />
            <AppText variant="caption" color={colors.textMuted}>
              {t("The video plays in its own platform's player on Fazl. Only public videos work.")}
            </AppText>
          </View>
        )
      ) : compressing !== null ? (
        <View style={[styles.picker, styles.pickerBusy]}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="bodyBold">{t('Compressing video...')}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {Math.round(compressing * 100)}%
          </AppText>
        </View>
      ) : video ? (
        <View style={styles.preview}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          {/* Plays the picked video, to check it before posting. */}
          <Pressable
            onPress={() => navigation.navigate('VideoPlayer', { uri: video.uri, title: caption.trim() || undefined })}
            style={styles.play}
            hitSlop={24}
            accessibilityRole="button"
            accessibilityLabel={t('Play video')}
          >
            <Play size={30} color={colors.white} fill={colors.white} />
          </Pressable>
          <Pressable
            onPress={() => {
              setVideo(null);
              setThumbnail(null);
            }}
            style={styles.remove}
            hitSlop={8}
            accessibilityLabel={t('Remove video')}
          >
            <X size={16} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={pickVideo} style={styles.picker}>
          <Clapperboard size={34} color={colors.primary} />
          <AppText variant="subheading" color={colors.primary}>
            {t('Post video')}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {t('60 seconds or less')}
          </AppText>
        </Pressable>
      )}

      <TextField label={t('Caption')} value={caption} onChangeText={setCaption} multiline maxLength={1000} style={styles.caption} />

      {products.length > 0 ? (
        <>
          <AppText variant="label" style={styles.label}>
            {t('Tag a product (optional)')}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tags}>
            <Pressable
              onPress={() => setTaggedId(null)}
              style={[styles.tag, styles.tagNone, taggedId === null && styles.tagActive]}
            >
              <AppText variant="label" color={taggedId === null ? colors.primary : colors.textMuted}>
                {t('No product')}
              </AppText>
            </Pressable>
            {products.map(p => (
              <Pressable
                key={p.id}
                onPress={() => setTaggedId(p.id)}
                style={[styles.tag, taggedId === p.id && styles.tagActive]}
              >
                <Thumb uri={p.images[0]} size={56} radius={10} />
                <AppText variant="small" numberOfLines={2} style={styles.tagTitle}>
                  {p.title}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  typeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  picker: {
    height: 200,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  pickerBusy: { borderStyle: 'solid' },
  preview: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { marginBottom: spacing.lg },
  modes: { marginBottom: spacing.lg },
  linkBlock: { gap: spacing.sm, marginBottom: spacing.lg },
  linkPreview: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkPoster: {
    width: 84,
    height: 112,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkChange: { marginTop: spacing.xs, textDecorationLine: 'underline' },
  rightsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { marginBottom: spacing.sm },
  tags: { gap: spacing.sm, paddingBottom: spacing.sm },
  tag: {
    width: 96,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 6,
  },
  tagNone: { justifyContent: 'center' },
  tagActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tagTitle: { textAlign: 'center' },
}));
