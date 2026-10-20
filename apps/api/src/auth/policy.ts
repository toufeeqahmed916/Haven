import type { AppRole, ComplaintTrack } from "../types/auth.ts";
export const staffRoles: readonly AppRole[] = ["control_room_admin", "department_officer", "response_team", "super_admin"];
export function isStaffRole(role: AppRole) { return staffRoles.includes(role); }
export function canAccessTrack(role: AppRole, track: ComplaintTrack) { if (role === "super_admin") return true; if (role === "control_room_admin") return track === "safety"; if (role === "department_officer") return track === "civic"; return false; }
export function needsAssignmentCheck(role: AppRole) { return role === "response_team"; }
