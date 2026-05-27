export type WorkplaceRole = 'guard' | 'manager' | 'supervisor' | 'dev';
export type LoginRole = 'guard' | 'boss' | 'dev';

const managerWorkplaceRoles = new Set(['boss', 'manager', 'admin', 'owner']);
const guardWorkplaceRoles = new Set(['guard', 'worker', 'lifeguard', 'technician']);

export const resolveDevUserRoles = (raw?: string | null): { workplaceRole: WorkplaceRole; loginRole: LoginRole } => {
  const role = raw?.toLowerCase().trim() ?? 'guard';

  if (role === 'dev') {
    return { workplaceRole: 'dev', loginRole: 'dev' };
  }

  if (role === 'supervisor') {
    return { workplaceRole: 'supervisor', loginRole: 'boss' };
  }

  if (managerWorkplaceRoles.has(role)) {
    return { workplaceRole: 'manager', loginRole: 'boss' };
  }

  if (guardWorkplaceRoles.has(role)) {
    return { workplaceRole: 'guard', loginRole: 'guard' };
  }

  return { workplaceRole: 'guard', loginRole: 'guard' };
};

export const formatWorkplaceRoleLabel = (role?: string | null) => {
  const normalized = role?.toLowerCase().trim() ?? '';
  if (normalized === 'supervisor') return 'Supervisor';
  if (managerWorkplaceRoles.has(normalized)) return 'Manager';
  if (normalized === 'dev') return 'Dev';
  if (guardWorkplaceRoles.has(normalized) || normalized === 'guard') return 'Lifeguard';
  return role || 'User';
};
