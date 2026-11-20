/**
 * Supabase Client Initializer
 * Provides authenticated client instances for both client-side and serverless backend environments.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClientInstance: SupabaseClient | null = null;
let publicClientInstance: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  return adminClientInstance;
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!publicClientInstance) {
    publicClientInstance = createClient(url, anonKey);
  }

  return publicClientInstance;
}
