import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-client";

function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (isAuthError(error)) {
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

// Singleton — shared between QueryProvider and the WebSocket handler
export const queryClient = makeQueryClient();
