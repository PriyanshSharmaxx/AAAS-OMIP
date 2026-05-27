"use client";

/**
 * Thin wrapper around the Zustand auth store.
 *
 * The store already persists state to localStorage via zustand/persist,
 * so this hook handles SSR safety (returns null on the server) and provides
 * a single import point for auth state across the app.
 */

import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  return { user, token, isAuthenticated, logout };
}
