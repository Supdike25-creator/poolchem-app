export type AppRole = "manager" | "employee" | "admin" | "dev";

export type AccountAccessReason =
  | "allowed"
  | "missing_profile"
  | "inactive"
  | "pending_approval"
  | "missing_workspace";

export type AccountAccessResult = {
  allowed: boolean;
  reason: AccountAccessReason;
  role: AppRole;
};

export const inactiveAccountMessage =
  "This account cannot access ChemDeck. Please contact your manager or administrator.";

const managerRoles = new Set(["admin", "manager", "owner", "boss", "supervisor"]);
const employeeRoles = new Set(["employee", "guard", "worker", "lifeguard", "technician"]);
const pendingStatuses = new Set(["pending", "unapproved"]);
const inactiveStatuses = new Set([
  "inactive",
  "disabled",
  "suspended",
  "rejected",
  "archived",
]);
const activeStatuses = new Set(["active", "approved", "enabled"]);

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

export function normalizeProfileRole(role?: string | null): AppRole {
  const normalized = role?.toLowerCase().trim();
  if (normalized === "dev") return "dev";
  if (normalized === "admin") return "admin";
  if (normalized && managerRoles.has(normalized)) return "manager";
  if (normalized && employeeRoles.has(normalized)) return "employee";
  return "employee";
}

export function routeForRole(role: AppRole) {
  if (role === "dev") return "/dev-dashboard";
  if (role === "manager" || role === "admin") return "/management/dashboard";
  return "/employee";
}

export function routeForAccess(result: AccountAccessResult) {
  if (result.reason === "pending_approval") return "/pending";
  return routeForRole(result.role);
}

export function getAccountAccess(profile: Record<string, unknown> | null | undefined): AccountAccessResult {
  if (!profile) {
    return {
      allowed: false,
      reason: "missing_profile",
      role: "employee",
    };
  }

  const rawRole = typeof profile.role === "string" ? profile.role.toLowerCase().trim() : "";
  const role = normalizeProfileRole(rawRole || null);
  const rawStatus = typeof profile.status === "string" ? profile.status.toLowerCase().trim() : null;

  if (rawStatus && pendingStatuses.has(rawStatus)) {
    return { allowed: false, reason: "pending_approval", role };
  }

  if (rawStatus && inactiveStatuses.has(rawStatus)) {
    return { allowed: false, reason: "inactive", role };
  }

  if (rawStatus && !activeStatuses.has(rawStatus)) {
    return { allowed: false, reason: "inactive", role };
  }

  const booleanBlocks = [
    ["disabled", true],
    ["is_disabled", true],
    ["active", false],
    ["is_active", false],
    ["approved", false],
    ["is_approved", false],
  ] as const;

  for (const [field, blockedValue] of booleanBlocks) {
    if (hasOwn(profile, field) && profile[field] === blockedValue) {
      return { allowed: false, reason: "inactive", role };
    }
  }

  if (role === "dev") {
    return {
      allowed: true,
      reason: "allowed",
      role,
    };
  }

  const workspaceFields = ["company_id", "organization_id"];
  const knownWorkspaceFields = workspaceFields.filter((field) => hasOwn(profile, field));

  if (knownWorkspaceFields.length > 0) {
    const hasWorkspace = knownWorkspaceFields.some((field) => Boolean(profile[field]));
    const isManagerRole = rawRole === "manager" || rawRole === "admin" || managerRoles.has(rawRole);
    if (!hasWorkspace && !isManagerRole) {
      return { allowed: false, reason: "missing_workspace", role };
    }
  }

  return {
    allowed: true,
    reason: "allowed",
    role,
  };
}
