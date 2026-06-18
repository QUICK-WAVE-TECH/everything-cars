"use client";

import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { WebSocketProvider } from "./websocket-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <WebSocketProvider>{children}</WebSocketProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export { QueryProvider } from "./query-provider";
export { AuthProvider } from "./auth-provider";
export { WebSocketProvider } from "./websocket-provider";
