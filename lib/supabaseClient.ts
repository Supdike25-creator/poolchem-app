import { createClient } from '@/utils/supabase/client';

let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient(): ReturnType<typeof createClient> {
  if (!supabase) {
    supabase = createClient();
  }

  return supabase;
}
