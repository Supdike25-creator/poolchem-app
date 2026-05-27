import { formatWorkplaceRoleLabel, resolveDevUserRoles } from '@/lib/devRoleMapping';

export const promotableTeamRoles = ['guard', 'supervisor', 'manager'] as const;
export type PromotableTeamRole = (typeof promotableTeamRoles)[number];

const promotableRoleSet = new Set<string>(promotableTeamRoles);

export const isPromotableTeamRole = (value?: string | null): value is PromotableTeamRole =>
  promotableRoleSet.has(String(value ?? '').toLowerCase());

export const workplaceRoleForPromotion = (role: PromotableTeamRole) => {
  const { workplaceRole } = resolveDevUserRoles(role);
  return workplaceRole;
};

export const roleSelectOptions: Array<{ value: PromotableTeamRole; label: string }> = [
  { value: 'guard', label: 'Lifeguard' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
];

export const formatTeamRoleLabel = (role?: string | null) => formatWorkplaceRoleLabel(role);

export const normalizeStoredTeamRole = (role?: string | null): PromotableTeamRole => {
  const normalized = String(role ?? 'guard').toLowerCase();
  if (normalized === 'supervisor') return 'supervisor';
  if (['boss', 'manager', 'admin', 'owner'].includes(normalized)) return 'manager';
  return 'guard';
};
