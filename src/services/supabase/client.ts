import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let clientPromise: Promise<SupabaseClient | undefined> | undefined;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    return Promise.resolve(undefined);
  }

  clientPromise ??= import("@supabase/supabase-js").then(
    ({ createClient }) =>
      createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
  );

  return clientPromise;
}
