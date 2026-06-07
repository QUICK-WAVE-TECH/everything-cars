import { create } from "zustand";
import type { UserRole } from "@/shared/types";

type AuthStore = {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
  setAuth: (userId: string, role: UserRole, token?: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  setAuth: (userId, role, token) => {
    if (token && typeof window !== "undefined") {
      window.__everythingcars_token = token;
    }
    set({ isAuthenticated: true, userId, userRole: role });
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      delete window.__everythingcars_token;
    }
    set({ isAuthenticated: false, userId: null, userRole: null });
  },
}));
