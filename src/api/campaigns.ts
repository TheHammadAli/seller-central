import { Campaign, CampaignStatus } from '../types/models';
import { t } from '../i18n';
import { api } from './http';

export type CampaignInput = Pick<
  Campaign,
  'name' | 'targetType' | 'productId' | 'budget' | 'startDate' | 'endDate'
> & {
  status: Exclude<CampaignStatus, 'completed'>;
};

function path(shopId: string, id?: string) {
  if (!shopId) throw new Error(t('No shop on this account.'));
  return `/seller/shops/${encodeURIComponent(shopId)}/campaigns${
    id ? `/${encodeURIComponent(id)}` : ''
  }`;
}

export async function listCampaigns(shopId: string): Promise<Campaign[]> {
  return api<Campaign[]>(path(shopId));
}

export async function getCampaign(
  shopId: string,
  id: string,
): Promise<Campaign> {
  return api<Campaign>(path(shopId, id));
}

export async function saveCampaign(
  shopId: string,
  input: CampaignInput,
  id?: string,
): Promise<Campaign> {
  return api<Campaign>(path(shopId, id), {
    method: id ? 'PATCH' : 'POST',
    body: input,
  });
}

export async function setCampaignStatus(
  shopId: string,
  id: string,
  status: CampaignStatus,
): Promise<Campaign> {
  return api<Campaign>(`${path(shopId, id)}/status`, {
    method: 'PATCH',
    body: { status },
  });
}
