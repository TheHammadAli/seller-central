import { Clapperboard, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { deleteShopVideo, listShopProducts, listShopVideos } from '../../api/shopContent';
import { AppText, Badge, Card, EmptyState, Header, Screen, StateView, Thumb } from '../../components';
import { useLoad } from '../../hooks/useLoad';
import { RootScreenProps } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing, themedStyles } from '../../theme';
import { Post } from '../../types/models';
import { timeAgo } from '../../utils/format';
import { t } from '../../i18n';

/** The active shop's videos on Fazl — its video posts and its products' videos. */
export function PostsScreen({ navigation }: RootScreenProps<'Posts'>) {
  const shop = useAuth().seller?.shop;
  const shopId = shop?.id ?? '';
  const { data, setData, error, reload, refresh, refreshing } = useLoad(async () => {
    const [videos, products] = await Promise.all([listShopVideos(shopId), listShopProducts(shopId)]);
    // Name the tagged product (the video list carries only its id).
    const titles = new Map(products.map(p => [p.id, p.title]));
    return videos.map(v => ({
      ...v,
      productTitle: v.productTitle ?? (v.productId ? titles.get(v.productId) : undefined),
    }));
  }, [shopId]);

  const remove = (post: Post) =>
    Alert.alert(
      t('Delete this video?'),
      post.isListing
        ? t('The video is removed from the product; the product itself stays listed.')
        : t('It will be removed from your shop page and the Fazl feed.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShopVideo(post.id);
              setData(d => d?.filter(p => p.id !== post.id));
            } catch (e) {
              Alert.alert(t("Couldn't delete the video"), e instanceof Error ? e.message : '');
            }
          },
        },
      ],
    );

  return (
    <Screen
      header={
        <Header
          title={t('Posts')}
          subtitle={
            data ? `${shop?.name} · ${t(data.length === 1 ? '{count} video' : '{count} videos', { count: data.length })}` : shop?.name
          }
          right={
            <Pressable
              onPress={() => navigation.navigate('AddPost', { type: 'video' })}
              style={styles.add}
              accessibilityLabel={t('Post a video')}
            >
              <Plus size={22} color={colors.white} />
            </Pressable>
          }
        />
      }
      scroll={false}
      padded={false}
    >
      {!data ? (
        <StateView error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon={Clapperboard}
              title={t('No videos yet')}
              message={t('Videos you post appear in your shop on Fazl and in the feed.')}
              actionLabel={t('Post a video')}
              onAction={() => navigation.navigate('AddPost', { type: 'video' })}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Thumb icon={Clapperboard} size={72} />
              <View style={styles.flex}>
                <View style={styles.topRow}>
                  <Badge label={item.isListing ? t('Product video') : t('Video post')} tone={item.isListing ? 'primary' : 'purple'} />
                  <AppText variant="caption" color={colors.textMuted}>
                    {timeAgo(item.createdAt)}
                  </AppText>
                </View>
                <AppText numberOfLines={3}>{item.caption}</AppText>
                {item.productTitle && !item.isListing ? (
                  <AppText variant="caption" color={colors.primary} numberOfLines={1}>
                    Tagged: {item.productTitle}
                  </AppText>
                ) : null}
              </View>
              <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel={t('Delete video')}>
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  add: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));
