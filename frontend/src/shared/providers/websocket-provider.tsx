"use client";

import { useNotificationsWebSocket } from "@/lib/use-websocket";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useNotificationsWebSocket();
  return <>{children}</>;
}
