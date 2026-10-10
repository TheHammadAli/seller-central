import { Bike, MapPin, Package, Star } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { assignRider, listNearbyRiders } from '../../api';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  Header,
  IconCircle,
  Screen,
  StateView,
} from '../../components';
import { useLoad } from '../../hooks/useLoad';
import { RootScreenProps } from '../../navigation/types';
import { colors, spacing, themedStyles } from '../../theme';
import { Rider } from '../../types/models';
import { t } from '../../i18n';

/** Nearby Fazl riders for one order, nearest available first. */
export function AssignRiderScreen({ route, navigation }: RootScreenProps<'AssignRider'>) {
  const { orderId } = route.params;
  const { data, error, reload } = useLoad(listNearbyRiders);
  const [assigning, setAssigning] = useState<string | null>(null);

  const assign = (rider: Rider) => {
    Alert.alert(
      t('Send to {name}?', { name: rider.name }),
      t('The rider gets a "New delivery request" notification and can accept it.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Send request'),
          onPress: async () => {
            setAssigning(rider.id);
            try {
              await assignRider(orderId, rider.id);
              navigation.goBack();
            } catch (e) {
              Alert.alert(t('Could not assign the rider'), e instanceof Error ? e.message : '');
              setAssigning(null);
            }
          },
        },
      ],
    );
  };

  const available = (data ?? []).filter(r => r.available).length;

  return (
    <Screen
      header={<Header title={t('Choose a rider')} subtitle={t('Riders near your shop')} />}
      scroll={false}
      padded={false}
    >
      {!data ? (
        <StateView error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.banner}>
              <IconCircle icon={Bike} size={44} />
              <View style={styles.flex}>
                <AppText variant="subheading">
                  {available} available rider{available === 1 ? '' : 's'} nearby
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {t('Sorted by who is free and closest to your shop.')}
                </AppText>
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={Bike}
              title={t('No riders online nearby')}
              message={t('Try again in a few minutes, or deliver this order yourself.')}
            />
          }
          renderItem={({ item }) => (
            <Card style={[styles.card, !item.available && styles.busy]}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <AppText variant="subheading" color={colors.primary}>
                    {item.name
                      .split(' ')
                      .map(w => w[0])
                      .join('')
                      .slice(0, 2)}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">{item.name}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {item.vehicle}
                  </AppText>
                </View>
                <Badge label={item.available ? t('Available') : t('Busy')} tone={item.available ? 'success' : 'neutral'} />
              </View>
              <View style={styles.facts}>
                <Fact icon={MapPin} text={t('{km} km away', { km: item.distanceKm })} />
                <Fact icon={Star} text={t('{rating} rating', { rating: item.rating.toFixed(1) })} />
                <Fact icon={Package} text={t('{count} deliveries', { count: item.deliveries })} />
              </View>
              <Button
                title={item.available ? t('Assign this rider') : t('On another delivery')}
                disabled={!item.available || assigning !== null}
                loading={assigning === item.id}
                size="sm"
                onPress={() => assign(item)}
              />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function Fact({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <View style={styles.fact}>
      <Icon size={14} color={colors.textMuted} />
      <AppText variant="caption" color={colors.textMuted}>
        {text}
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xs,
  },
  card: { gap: spacing.md },
  busy: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));
