// The shop owner's team (More > Team): people invited by email with a
// 6-digit code who then log in as Team Members, with the permissions the
// owner gave. Only the owner's own login can manage it.
import { SellerMemberPermission, TeamMember } from '../types/models';
import { api } from './http';

/** The invited member, and the code they join with (also emailed to them). */
export interface Invite {
  member: TeamMember;
  inviteCode: string;
}

export function listTeam(): Promise<TeamMember[]> {
  return api<TeamMember[]>('/seller/members');
}

export function inviteTeamMember(draft: {
  name: string;
  email: string;
  permissions: SellerMemberPermission[];
}): Promise<Invite> {
  return api<Invite>('/seller/members', { method: 'POST', body: draft });
}

export function resendTeamInvite(memberId: string): Promise<Invite> {
  return api<Invite>(`/seller/members/${memberId}/resend-invite`, { method: 'POST' });
}

export function updateTeamMember(
  memberId: string,
  changes: { name?: string; permissions?: SellerMemberPermission[]; isDisabled?: boolean },
): Promise<TeamMember> {
  return api<TeamMember>(`/seller/members/${memberId}`, { method: 'PATCH', body: changes });
}

export function removeTeamMember(memberId: string): Promise<void> {
  return api<void>(`/seller/members/${memberId}`, { method: 'DELETE' });
}
