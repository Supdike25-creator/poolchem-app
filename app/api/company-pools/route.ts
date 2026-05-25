import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDevRequest } from "@/lib/auth/devSession";
import { resolveDevCompanyId } from "@/lib/devTools";
import { loadGuardPools } from "@/lib/guardPools";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const poolColumns = [
  "id",
  "name",
  "volume_gallons",
  "pool_type",
  "is_baby_pool",
  "target_chlorine_min",
  "target_chlorine_max",
  "target_ph_min",
  "target_ph_max",
  "default_chlorine_type",
  "default_chlorine_strength",
  "max_single_dose_oz",
  "retest_minutes",
].join(",");

export async function GET(request: NextRequest) {
  const rawDevCompanyId = isDevRequest(request) ? request.nextUrl.searchParams.get("companyId") : null;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
  const devCompanyId = rawDevCompanyId && adminClient
    ? await resolveDevCompanyId(adminClient, rawDevCompanyId)
    : rawDevCompanyId;

  if ((userError || !user) && !devCompanyId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const db = adminClient ?? supabase;
  let companyId = devCompanyId;

  if (!companyId && user) {
    const { data: account, error: accountError } = await db
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle<{ company_id: string | null }>();

    if (accountError) {
      return NextResponse.json({ ok: false, message: accountError.message }, { status: 500 });
    }

    companyId = account?.company_id ?? null;
  }

  if (!companyId) {
    return NextResponse.json({ ok: false, message: "No company found" }, { status: 400 });
  }

  let guardId: string | null = null;
  let guardRole: string | null = null;

  if (user && !devCompanyId) {
    const { data: account } = await db
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle<{ id: string; role?: string | null }>();
    guardId = account?.id ?? null;
    guardRole = account?.role ?? null;
  }

  try {
    const pools = await loadGuardPools(db, {
      companyId,
      guardId,
      guardRole,
      devPreview: Boolean(devCompanyId),
      select: poolColumns,
    });

    return NextResponse.json({ ok: true, pools });
  } catch (poolsError) {
    return NextResponse.json(
      { ok: false, message: poolsError instanceof Error ? poolsError.message : "Unable to load pools." },
      { status: 500 },
    );
  }
}
