import { createClient } from "@supabase/supabase-js";
const auth = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } as const;
export function createAuthClient(url: string, anonKey: string) { return createClient(url, anonKey, { auth }); }
export function createUserClient(url: string, anonKey: string, token: string) { return createClient(url, anonKey, { auth, global: { headers: { Authorization: `Bearer ${token}` } } }); }
export function createServiceClient(url: string, serviceRoleKey: string) { return createClient(url, serviceRoleKey, { auth }); }
