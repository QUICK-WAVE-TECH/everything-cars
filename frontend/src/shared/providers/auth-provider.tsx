"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/shared/types";

type AuthState = {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
};

type AuthContextValue = AuthState & {
  setToken: (token: string) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

/**
 * AuthProvider — wraps app with authentication context.
 * Token is stored in memory (window.__everythingcars_token) for security.
 * Full implementation comes with the auth feature plan.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value: AuthContextValue = {
    isAuthenticated: false,
    userRole: null,
    userId: null,
    setToken: (token: string) => {
      if (typeof window !== "undefined") {
        window.__everythingcars_token = token;
      }
    },
    clearAuth: () => {
      if (typeof window !== "undefined") {
        delete window.__everythingcars_token;
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
