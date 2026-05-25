import { resolveDevCompanyId } from '@/lib/devTools';
import { createAdminClient } from '@/lib/supabase/admin';

export const resolveCompanyScopeId = async (raw?: string | null): Promise<string | undefined> => {
  const value = raw?.trim();
  if (!value) return undefined;

  try {
    const supabase = createAdminClient();
    return (await resolveDevCompanyId(supabase, value)) ?? undefined;
  } catch {
    return undefined;
  }
};
