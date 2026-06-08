import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api-client";
import type { UserRole } from "@/shared/types";
import { useAuthStore } from "../store";

// ---------- Types ----------

type BaseSignUpData = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  phone?: string;
};

export type CustomerSignUpData = BaseSignUpData & {
  role: "customer";
  drivers_license?: string;
  date_of_birth?: string;
  address?: string;
  state?: string;
  city?: string;
  country?: string;
};

export type OwnerSignUpData = BaseSignUpData & {
  role: "owner";
  owner_type: "individual" | "fleet";
  fleet_name?: string;
  national_id?: string;
  location?: string;
  rc_number?: string;
  bank_account: string;
  bank_name: string;
  document?: File;
};

export type SignUpData = CustomerSignUpData | OwnerSignUpData;

export type SignInData = {
  email: string;
  password: string;
};

export type VerifyData = {
  email: string;
  code: string;
  purpose: "sign_in" | "sign_up_verify";
};

export type AuthResponse = {
  message: string;
  email: string;
};

export type VerifyResponse = {
  accessToken: string;
  userId: string;
  role: UserRole;
  expiresIn: number;
};

export type UserProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  date_joined: string;
  customer_profile: {
    drivers_license: string;
    date_of_birth: string | null;
    address: string;
    state: string;
    city: string;
    country: string;
  } | null;
  owner_profile: {
    owner_type: string;
    fleet_name: string;
    national_id: string;
    location: string;
    rc_number: string;
    bank_account: string;
    bank_name: string;
    is_verified: boolean;
  } | null;
};

type SignOutResponse = {
  message: string;
};

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function toSignUpBody(data: SignUpData): SignUpData | FormData {
  if (data.role !== "owner" || !data.document) {
    return data;
  }

  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    formData.append(key, isFile(value) ? value : String(value));
  });

  return formData;
}

function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

// ---------- Hooks ----------
export function useSignUp() {
  return useMutation({
    mutationFn: (data: SignUpData) =>
      apiClient.post<AuthResponse>("/auth/sign-up", toSignUpBody(data)),
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: (data: SignInData) =>
      apiClient.post<AuthResponse>("/auth/sign-in", data),
  });
}

export function useVerify() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VerifyData) =>
      apiClient.post<VerifyResponse>("/auth/verify", data),
    onSuccess: (data) => {
      setAuth(data.userId, data.role, data.accessToken);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useMe() {
  const { clearAuth, setAuth, hasSession } = useAuthStore();

  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get<UserProfile>("/users/me"),
    enabled: hasSession, // Skip API call if user has never logged in on this browser
    staleTime: 5 * 60 * 1000, //5minutes
  });

  useEffect(() => {
    if (query.data) {
      setAuth(query.data.id, query.data.role);
    }
  }, [query.data, setAuth]);

  useEffect(() => {
    if (isAuthError(query.error)) {
      clearAuth();
    }
  }, [clearAuth, query.error]);

  return query;
}

export function useSignOut() {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<SignOutResponse>("/auth/sign-out"),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}
