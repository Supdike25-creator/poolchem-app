export type AppRole = "manager" | "guard" | "dev";

export type AccountAccessReason =
  | "allowed"
  | "missing_profile"
  | "inactive"
  | "missing_workspace";

export type AccountAccessResult = {
  allowed: boolean;
  reason: AccountAccessReason;
  role: AppRole;
};

export const inactiveAccountMessage =
  "Your account is not active yet. Please contact your manager or administrator.";

const managerRoles = new Set(["admin", "manager", "supervisor", "owner", "boss"]);
const guardRoles = new Set(["guard", "worker", "lifeguard", "technician"]);
const inactiveStatuses = new Set([
  "inactive",
  "disabled",
  "pending",
  "unapproved",
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
  if (normalized && managerRoles.has(normalized)) return "manager";
  if (normalized && guardRoles.has(normalized)) return "guard";
  return "guard";
}

export function routeForRole(role: AppRole) {
  if (role === "dev") return "/dev-dashboard";
  return role === "manager" ? "/management/dashboard" : "/guard";
}

export function getAccountAccess(profile: Record<string, unknown> | null | undefined): AccountAccessResult {
  if (!profile) {
    return {
      allowed: false,
      reason: "missing_profile",
      role: "guard",
    };
  }

  const role = normalizeProfileRole(typeof profile.role === "string" ? profile.role : null);
  const rawStatus = typeof profile.status === "string" ? profile.status.toLowerCase().trim() : null;

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

  const workspaceFields = ["organization_id", "company_id", "app_account_id"];
  const knownWorkspaceFields = workspaceFields.filter((field) => hasOwn(profile, field));

  if (knownWorkspaceFields.length > 0) {
    const hasWorkspace = knownWorkspaceFields.some((field) => Boolean(profile[field]));
    if (!hasWorkspace) {
      return { allowed: false, reason: "missing_workspace", role };
    }
  }

  return {
    allowed: true,
    reason: "allowed",
    role,
  };
}
