import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const serviceRoleConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const duplicateEmailMessage = "An account with that email already exists.";

const isDuplicateError = (message?: string) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("already") || normalized.includes("duplicate") || normalized.includes("unique");
};

const isMissingOptionalTable = (message?: string) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("relation") && normalized.includes("does not exist");
};

const profilePayload = (id: string, email: string, fullName?: string | null) => ({
  id,
  email,
  full_name: fullName?.trim() || email,
  role: "guard",
  status: "active",
  company_id: null,
});

const publicUserPayload = (id: string, email: string, fullName?: string | null) => ({
  id,
  email,
  full_name: fullName?.trim() || email,
  role: "guard",
  status: "active",
  company_id: null,
});

async function createAccountWithAdminClient(email: string, password: string, fullName?: string | null) {
  const supabase = createAdminClient();

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileLookupError && !isMissingOptionalTable(profileLookupError.message)) {
    return NextResponse.json({ ok: false, message: profileLookupError.message }, { status: 500 });
  }

  if (existingProfile) {
    return NextResponse.json({ ok: false, message: duplicateEmailMessage }, { status: 409 });
  }

  const { data, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "guard",
    },
  });

  if (createError || !data.user) {
    const duplicate = isDuplicateError(createError?.message);
    return NextResponse.json(
      { ok: false, message: duplicate ? duplicateEmailMessage : createError?.message ?? "Unable to create account." },
      { status: duplicate ? 409 : 400 },
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profilePayload(data.user.id, email, fullName), { onConflict: "id" });

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    return NextResponse.json({ ok: false, message: profileError.message }, { status: 500 });
  }

  const { error: usersError } = await supabase
    .from("users")
    .upsert(publicUserPayload(data.user.id, email, fullName), { onConflict: "id" });

  if (usersError && !isMissingOptionalTable(usersError.message)) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    return NextResponse.json({ ok: false, message: usersError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Account created." }, { status: 201 });
}

async function createAccountWithPublicAuth(email: string, password: string) {
  const supabase = await createClient();

  const { data, error: createError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "guard",
      },
    },
  });

  if (createError || !data.user) {
    const duplicate = isDuplicateError(createError?.message);
    return NextResponse.json(
      { ok: false, message: duplicate ? duplicateEmailMessage : createError?.message ?? "Unable to create account." },
      { status: duplicate ? 409 : 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "Account created." }, { status: 201 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string; full_name?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const fullName = body?.full_name?.trim() || null;

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    if (serviceRoleConfigured) {
      return await createAccountWithAdminClient(email, password, fullName);
    }

    return await createAccountWithPublicAuth(email, password);
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
