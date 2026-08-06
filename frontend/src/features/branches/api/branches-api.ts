import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";

import type { Branch, BranchInput } from "./types";

export const branchKeys = {
  all: ["branches"] as const,
  list: () => [...branchKeys.all, "list"] as const,
  detail: (id: string) => [...branchKeys.all, id] as const,
};

/** All branches for the signed-in fleet business (active first, then by name). */
export function useMyBranches() {
  return useQuery({
    queryKey: branchKeys.list(),
    queryFn: () => apiClient.get<PaginatedResponse<Branch>>("/owner/branches/"),
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BranchInput) =>
      apiClient.post<Branch>("/owner/branches/", input),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: branchKeys.list() }),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BranchInput> }) =>
      apiClient.patch<Branch>(`/owner/branches/${id}/`, input),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: branchKeys.list() }),
  });
}

export function useDeactivateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Branch>(`/owner/branches/${id}/deactivate/`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: branchKeys.list() }),
  });
}

export function useReactivateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Branch>(`/owner/branches/${id}/reactivate/`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: branchKeys.list() }),
  });
}
