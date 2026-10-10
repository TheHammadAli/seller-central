import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card } from '../../components';
import { colors, radius, spacing, themedStyles, Tone } from '../../theme';
import { Campaign, CampaignStatus } from '../../types/models';
import { formatRs } from '../../utils/format';
import { t } from '../../i18n';

export const CAMPAIGN_STATUS: Record<
  CampaignStatus,
  { label: string; tone: Tone }
> = {
  active: { label: t('Active'), tone: 'success' },
  paused: { label: t('Paused'), tone: 'warning' },
  completed: { label: t('Completed'), tone: 'neutral' },
};

export function CampaignBadge({ campaign }: { campaign: Campaign }) {
  const display = campaign.isScheduled
    ? { label: t('Scheduled'), tone: 'info' as Tone }
    : CAMPAIGN_STATUS[campaign.status];
  return <Badge label={display.label} tone={display.tone} />;
}

export function CampaignDeliveryNotice() {
  return (
    <Card style={styles.notice}>
      <AppText variant="bodyBold">
        {t('Ad delivery is not enabled yet')}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {t(
          'You can save and manage campaigns here. Views, clicks, orders and spending will remain zero until ads start running on Fazl.',
        )}
      </AppText>
    </Card>
  );
}

/** Spent of budget, as a bar with the numbers under it. */
export function BudgetBar({ campaign }: { campaign: Campaign }) {
  const share = campaign.budget
    ? Math.min(1, campaign.spent / campaign.budget)
    : 0;
  return (
    <View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${share * 100}%`,
              backgroundColor: share >= 0.9 ? colors.warning : colors.primary,
            },
          ]}
        />
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" color={colors.textMuted}>
          {formatRs(campaign.spent)} spent
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          of {formatRs(campaign.budget)}
        </AppText>
      </View>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    notice: { marginBottom: spacing.md, gap: spacing.xs },
    track: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.divider,
      overflow: 'hidden',
    },
    fill: { height: 8, borderRadius: radius.pill },
    labels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
  }),
);
