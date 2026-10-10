import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clapperboard, Info, PackagePlus, Play, X } from 'lucide-react-native';
import { ChevronForward } from '../../components/Chevrons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { createVideoThumbnail } from 'react-native-compressor';
import { launchImageLibrary } from 'react-native-image-picker';
import { listShopProducts, postShopVideo, UploadFile } from '../../api/shopContent';
import { AppText, Button, Card, Header, IconCircle, Screen, TextField, Thumb } from '../../components';
import { RootScreenProps, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { Product } from '../../types/models';
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

/**
 * The Fazl app's shop "Post video" (Native-fazl-app PostVideoScreen): the video
 * is compressed as soon as it's picked, then a caption and an optional tagged
 * product — same fields, rules and messages.
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

  const submit = async () => {
    if (compressing !== null || submitting) return;
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
          title={submitting ? t('Uploading video...') : t('Post video')}
          flex
          disabled={submitting || compressing !== null}
          onPress={submit}
        />
      }
    >
      {compressing !== null ? (
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
          <View style={styles.play}>
            <Play size={30} color={colors.white} fill={colors.white} />
          </View>
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
