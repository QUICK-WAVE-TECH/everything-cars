import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";

import type { Scope, TeamMember, TeamMemberInput } from "./types";

export const teamKeys = {
  all: ["team"] as const,
  list: () => [...teamKeys.all, "list"] as const,
  scope: ["me", "scope"] as const,
};

/** All team members for the signed-in business. */
export function useTeam() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: () => apiClient.get<PaginatedResponse<TeamMember>>("/owner/team/"),
  });
}

/** The caller's effective scope — which branches they can use + whether they
 * can manage the team. Also usable by team members. */
export function useMyScope() {
  return useQuery({
    queryKey: teamKeys.scope,
    queryFn: () => apiClient.get<Scope>("/owner/me/scope"),
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TeamMemberInput) =>
      apiClient.post<TeamMember>("/owner/team/", input),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.list() }),
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<Pick<TeamMemberInput, "title" | "branch_ids">>;
    }) => apiClient.patch<TeamMember>(`/owner/team/${id}/`, input),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.list() }),
  });
}

export function useDeactivateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<TeamMember>(`/owner/team/${id}/deactivate/`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.list() }),
  });
}

export function useReactivateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<TeamMember>(`/owner/team/${id}/reactivate/`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.list() }),
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/owner/team/${id}/`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.list() }),
  });
}
