import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";

export type AdminOwner = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  owner_type: string;
  fleet_name: string;
  rc_number: string;
  id_type: string;
  id_type_display: string;
  national_id: string;
  id_document: string | null;
  document: string | null;
  country: string;
  state: string;
  city: string;
  address: string;
  is_verified: boolean;
  created_at: string;
};

const ownerKeys = {
  all: ["admin-owners"] as const,
  list: (params?: Record<string, string | undefined>) =>
    ["admin-owners", params ?? {}] as const,
};

export function useAdminOwners(params?: { verified?: string }) {
  const query = new URLSearchParams();
  if (params?.verified) query.set("verified", params.verified);
  const qs = query.toString();
  return useQuery({
    queryKey: ownerKeys.list(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<AdminOwner>>(
        `/users/admin/owners${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 15_000,
  });
}

export function useVerifyOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, verify = true }: { userId: string; verify?: boolean }) =>
      apiClient.post<AdminOwner>(`/users/admin/owners/${userId}/verify`, {
        verify,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.all });
    },
  });
}
