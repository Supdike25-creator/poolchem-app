import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeProfileRole, routeForRole } from "@/lib/auth/accountAccess";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  role?: string | null;
  company_id?: string | null;
  status?: string | null;
};

type UserRow = ProfileRow & {
  email?: string | null;
};

const serviceRoleConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const normalizeCompanyCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ ok: false, message }, { status });

const optionalTableMissing = (message?: string) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("relation") && normalized.includes("does not exist");
};

const optionalColumnMissing = (message?: string) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("column") && normalized.includes("does not exist");
};

const createWorkerProfilePayload = (userId: string, email: string) => ({
  id: userId,
  email,
  full_name: email,
  role: "guard",
  status: "active",
  active: true,
  company_id: null,
});

async function updateCompanyMembership(
  db: SupabaseClient,
  table: "profiles" | "users" | "app_accounts",
  userColumn: "id" | "auth_user_id",
  userId: string,
  companyId: string,
  membershipStatus: "active" | "pending" = "active",
) {
  const updateWithActive = {
    company_id: companyId,
    status: membershipStatus,
    active: membershipStatus === "active",
  };

  const updateWithoutActive = {
    company_id: companyId,
    status: membershipStatus,
  };

  const result = await db
    .from(table)
    .update(updateWithActive)
    .eq(userColumn, userId)
    .is("company_id", null);

  if (result.error && optionalColumnMissing(result.error.message)) {
    return db
      .from(table)
      .update(updateWithoutActive)
      .eq(userColumn, userId)
      .is("company_id", null);
  }

  return result;
}

async function upsertWorkerRows(db: SupabaseClient, userId: string, email: string) {
  const withActive = createWorkerProfilePayload(userId, email);
  const withoutActive = {
    id: userId,
    email,
    full_name: email,
    role: "guard",
    status: "active",
    company_id: null,
  };

  const profileResult = await db
    .from("profiles")
    .upsert(withActive, { onConflict: "id" });

  if (profileResult.error && optionalColumnMissing(profileResult.error.message)) {
    const retryProfile = await db
      .from("profiles")
      .upsert(withoutActive, { onConflict: "id" });
    if (retryProfile.error) return retryProfile;
  } else if (profileResult.error) {
    return profileResult;
  }

  const usersResult = await db
    .from("users")
    .upsert(withActive, { onConflict: "id" });

  if (usersResult.error && optionalColumnMissing(usersResult.error.message)) {
    return db
      .from("users")
      .upsert(withoutActive, { onConflict: "id" });
  }

  return usersResult;
}

async function updateAuthCompanyMetadata(userId: string, companyId: string, role?: string | null) {
  if (!serviceRoleConfigured) {
    return;
  }

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const currentUser = data.user;

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(currentUser?.app_metadata ?? {}),
      company_id: companyId,
    },
    user_metadata: {
      ...(currentUser?.user_metadata ?? {}),
      company_id: companyId,
      role: role || currentUser?.user_metadata?.role || "guard",
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Sign in before joining a company.", 401);
  }

  const body = await request.json().catch(() => null) as { company_code?: string } | null;
  const companyCode = normalizeCompanyCode(body?.company_code);

  if (!companyCode) {
    return jsonError("Enter a company code.");
  }

  const db = serviceRoleConfigured ? createAdminClient() : supabase;

  const { data: initialUserRow, error: userLookupError } = await db
    .from("users")
    .select("id,role,company_id,status")
    .eq("id", user.id)
    .maybeSingle<UserRow>();

  let account = initialUserRow;

  if (userLookupError && !optionalTableMissing(userLookupError.message)) {
    return jsonError(userLookupError.message, 500);
  }

  if (!account) {
    const email = user.email?.trim().toLowerCase() || `${user.id}@chemdeck.local`;
    const upsertResult = await upsertWorkerRows(db, user.id, email);

    if (upsertResult.error && !optionalTableMissing(upsertResult.error.message)) {
      return jsonError(upsertResult.error.message, 500);
    }

    const userResult = await db
      .from("users")
      .select("id,role,company_id,status")
      .eq("id", user.id)
      .maybeSingle<UserRow>();

    if (userResult.error || !userResult.data) {
      return jsonError(userResult.error?.message || "Unable to prepare your account profile.", 500);
    }

    account = userResult.data;
  }

  if (normalizeProfileRole(account.role) === "dev") {
    return jsonError("Dev accounts do not join companies.");
  }

  if (account.company_id) {
    const existingCompanyId = account.company_id;
    await updateAuthCompanyMetadata(user.id, existingCompanyId, account.role);

    return NextResponse.json({
      ok: true,
      message: "Company already joined.",
      company_id: existingCompanyId,
      redirectTo: routeForRole(normalizeProfileRole(account.role)),
    });
  }

  const { data: company, error: companyError } = await db
    .from("companies")
    .select("id,company_name,company_code")
    .eq("company_code", companyCode)
    .maybeSingle<{ id: string; company_name: string; company_code: string }>();

  if (companyError) {
    return jsonError(companyError.message, 500);
  }

  if (!company) {
    return jsonError("Invalid or expired company code.", 404);
  }

  const membershipStatus = normalizeProfileRole(account.role) === "guard" ? "pending" : "active";

  const { error: updateUserError } = await updateCompanyMembership(db, "users", "id", user.id, company.id, membershipStatus);

  if (updateUserError && !optionalTableMissing(updateUserError.message)) {
    return jsonError(updateUserError.message, 500);
  }

  const { error: updateProfileError } = await updateCompanyMembership(db, "profiles", "id", user.id, company.id, membershipStatus);

  if (
    updateProfileError &&
    !optionalTableMissing(updateProfileError.message) &&
    !optionalColumnMissing(updateProfileError.message)
  ) {
    return jsonError(updateProfileError.message, 500);
  }

  const { error: updateAppAccountError } = await updateCompanyMembership(db, "app_accounts", "auth_user_id", user.id, company.id, membershipStatus);

  if (
    updateAppAccountError &&
    !optionalTableMissing(updateAppAccountError.message) &&
    !optionalColumnMissing(updateAppAccountError.message)
  ) {
    return jsonError(updateAppAccountError.message, 500);
  }

  await updateAuthCompanyMetadata(user.id, company.id, account.role);

  const response = NextResponse.json({
    ok: true,
    message: membershipStatus === "pending" ? "Company joined. Waiting for manager approval." : "Company joined.",
    company,
    company_id: company.id,
    redirectTo: membershipStatus === "pending" ? "/pending" : routeForRole(normalizeProfileRole(account.role)),
  });

  response.cookies.delete("chemdeck.pendingRole");
  return response;
}
