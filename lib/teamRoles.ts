import { formatWorkplaceRoleLabel, resolveDevUserRoles } from '@/lib/devRoleMapping';

export const promotableTeamRoles = ['employee', 'manager'] as const;
export type PromotableTeamRole = (typeof promotableTeamRoles)[number];

const promotableRoleSet = new Set<string>(promotableTeamRoles);

export const isPromotableTeamRole = (value?: string | null): value is PromotableTeamRole =>
  promotableRoleSet.has(String(value ?? '').toLowerCase());

export const workplaceRoleForPromotion = (role: PromotableTeamRole) => {
  const { workplaceRole } = resolveDevUserRoles(role);
  return workplaceRole;
};

export const roleSelectOptions: Array<{ value: PromotableTeamRole; label: string }> = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
];

export const formatTeamRoleLabel = (role?: string | null) => formatWorkplaceRoleLabel(role);

export const normalizeStoredTeamRole = (role?: string | null): PromotableTeamRole => {
  const normalized = String(role ?? 'employee').toLowerCase();
  if (['boss', 'manager', 'admin', 'owner', 'supervisor'].includes(normalized)) return 'manager';
  return 'employee';
};
