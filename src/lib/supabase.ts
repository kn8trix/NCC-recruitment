import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !publicKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local .env file or Vercel project environment variables, then restart or redeploy.",
    );
  }

  if (!url.startsWith("https://")) {
    throw new Error("VITE_SUPABASE_URL must be an HTTPS Supabase project URL.");
  }

  return createClient(url, publicKey);
}
