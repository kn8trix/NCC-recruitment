import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !publicKey) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local .env file.",
    );
  }

  if (!url.startsWith("https://")) {
    throw new Error("VITE_SUPABASE_URL must be an HTTPS Supabase project URL.");
  }

  return createClient(url, publicKey);
}
