import type { AuthUser } from "@/store/auth-store";

// ── Demo users ─────────────────────────────────────────────────────────────
// Roles must match the casing the app checks: "CREATOR" | "USER"

export const DEMO_USER: AuthUser = {
  id: "demo-user-1",
  username: "Demo User",
  email: "demo@aas.com",
  role: "USER",
};

export const DEMO_CREATOR: AuthUser = {
  id: "demo-creator-1",
  username: "Demo Creator",
  email: "creator@aas.com",
  role: "CREATOR",
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns the matching demo user by email, or null if not a demo email. */
export function demoLogin(email: string): AuthUser | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === DEMO_USER.email) return DEMO_USER;
  if (normalized === DEMO_CREATOR.email) return DEMO_CREATOR;
  return null;
}

/** Returns the demo user for a given role (used during signup). */
export function demoSignup(role: "USER" | "CREATOR"): AuthUser {
  return role === "CREATOR" ? DEMO_CREATOR : DEMO_USER;
}

/** A synthetic token used in demo mode — has no real authority. */
export const DEMO_TOKEN = "demo-mode-token";
