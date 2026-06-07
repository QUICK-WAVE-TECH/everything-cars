"use client";

import { useMe } from "@/features/auth/api";

/**
 * AuthProvider — triggers silent auth refresh on app load.
 *
 * On mount, useMe() fires GET /users/me. If a valid refresh_token cookie
 * exists, the API client auto-refreshes the access token on 401, then useMe
 * syncs user data to the Zustand auth store. If no cookie or refresh fails,
 * useMe clears the store — the user stays logged out.
 *
 * No Context needed — all auth state lives in Zustand (useAuthStore).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // This triggers the silent refresh + store sync on app load
  useMe();

  return <>{children}</>;
}
