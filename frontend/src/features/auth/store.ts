import { create } from "zustand";
import type { UserRole } from "@/shared/types";

const SESSION_KEY = "ec_has_session";

function getHasSession(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.localStorage?.getItem !== "function") return false;
  return window.localStorage.getItem(SESSION_KEY) === "1";
}

type AuthStore = {
  isAuthenticated: boolean;
  hasSession: boolean;
  userRole: UserRole | null;
  userId: string | null;
  setAuth: (userId: string, role: UserRole, token?: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  hasSession: getHasSession(),
  userRole: null,
  userId: null,
  setAuth: (userId, role, token) => {
    if (token && typeof window !== "undefined") {
      window.__everythingcars_token = token;
    }
    if (typeof window !== "undefined" && typeof window.localStorage?.setItem === "function") {
      window.localStorage.setItem(SESSION_KEY, "1");
    }
    set({ isAuthenticated: true, hasSession: true, userId, userRole: role });
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      delete window.__everythingcars_token;
      if (typeof window.localStorage?.removeItem === "function") {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
    set({ isAuthenticated: false, hasSession: false, userId: null, userRole: null });
  },
}));
