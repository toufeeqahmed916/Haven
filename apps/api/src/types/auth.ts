import type { SupabaseClient, User } from "@supabase/supabase-js";

export const appRoles = ["citizen", "control_room_admin", "response_team", "department_officer", "super_admin"] as const;
export type AppRole = typeof appRoles[number];
export type ComplaintTrack = "safety" | "civic";
export type AuthContext = { token: string; user: User; profile: { id: string; role: AppRole; displayName: string | null; language: "en" | "ur" | "sd"; isActive: boolean }; userClient: SupabaseClient };
