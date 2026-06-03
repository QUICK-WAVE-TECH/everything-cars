import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-client";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (error instanceof ApiError && error.status === 401) {
            return false;
          }
          return failureCount < 3;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
