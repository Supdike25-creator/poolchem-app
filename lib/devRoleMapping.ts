export type WorkplaceRole = 'employee' | 'manager' | 'admin' | 'dev';
export type LoginRole = 'employee' | 'manager' | 'dev';

const managerWorkplaceRoles = new Set(['boss', 'manager', 'admin', 'owner', 'supervisor']);
const employeeWorkplaceRoles = new Set(['employee', 'guard', 'worker', 'lifeguard', 'technician']);

export const resolveDevUserRoles = (raw?: string | null): { workplaceRole: WorkplaceRole; loginRole: LoginRole } => {
  const role = raw?.toLowerCase().trim() ?? 'employee';

  if (role === 'dev') {
    return { workplaceRole: 'dev', loginRole: 'dev' };
  }

  if (role === 'admin') {
    return { workplaceRole: 'admin', loginRole: 'manager' };
  }

  if (managerWorkplaceRoles.has(role)) {
    return { workplaceRole: 'manager', loginRole: 'manager' };
  }

  if (employeeWorkplaceRoles.has(role)) {
    return { workplaceRole: 'employee', loginRole: 'employee' };
  }

  return { workplaceRole: 'employee', loginRole: 'employee' };
};

export const formatWorkplaceRoleLabel = (role?: string | null) => {
  const normalized = role?.toLowerCase().trim() ?? '';
  if (normalized === 'admin') return 'Admin';
  if (managerWorkplaceRoles.has(normalized)) return 'Manager';
  if (normalized === 'dev') return 'Dev';
  if (employeeWorkplaceRoles.has(normalized) || normalized === 'employee') return 'Employee';
  return role || 'User';
};
