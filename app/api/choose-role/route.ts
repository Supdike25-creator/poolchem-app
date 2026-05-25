import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const serviceRoleConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const validRoles = new Set(["boss", "guard"]);

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

async function upsertUserRole(
  userId: string,
  email: string,
  role: "boss" | "guard",
) {
  const db = serviceRoleConfigured ? createAdminClient() : await createClient();
  const updateWithActive = {
    email,
    full_name: email,
    role,
    status: "active",
    active: true,
  };

  const updateWithoutActive = {
    email,
    full_name: email,
    role,
    status: "active",
  };

  let result = await db
    .from("users")
    .update(updateWithActive)
    .eq("id", userId)
    .select("id");

  if (result.error && optionalColumnMissing(result.error.message)) {
    result = await db
      .from("users")
      .update(updateWithoutActive)
      .eq("id", userId)
      .select("id");
  }

  if (result.error || (result.data && result.data.length > 0)) {
    return result;
  }

  const insertWithActive = {
    id: userId,
    email,
    full_name: email,
    role,
    status: "active",
    active: true,
  };

  const insertWithoutActive = {
    id: userId,
    email,
    full_name: email,
    role,
    status: "active",
  };

  const insertResult = await db
    .from("users")
    .insert(insertWithActive)
    .select("id");

  if (insertResult.error && optionalColumnMissing(insertResult.error.message)) {
    return db.from("users").insert(insertWithoutActive).select("id");
  }

  return insertResult;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Sign in before choosing a role.", 401);
  }

  const body = await request.json().catch(() => null) as { role?: string } | null;
  const role = body?.role?.trim().toLowerCase();

  if (!role || !validRoles.has(role)) {
    return jsonError("Choose Manager or Lifeguard.");
  }

  const selectedRole = role as "boss" | "guard";
  const email = user.email?.trim().toLowerCase() || `${user.id}@chemdeck.local`;

  const userResult = await upsertUserRole(user.id, email, selectedRole);
  if (userResult.error) {
    if (optionalTableMissing(userResult.error.message)) {
      return jsonError("Users table is missing. Run the account schema migration first.", 500);
    }
    return jsonError(userResult.error.message, 500);
  }

  const response = NextResponse.json({
    ok: true,
    role: selectedRole,
    redirectTo: "/enter-company-code",
  });

  response.cookies.set("chemdeck.pendingRole", selectedRole, {
    path: "/",
    maxAge: 600,
    sameSite: "lax",
  });

  return response;
}
