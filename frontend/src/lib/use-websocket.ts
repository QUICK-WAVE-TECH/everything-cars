"use client";

import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "./query-client";
import { config } from "./config";
import { useAuthStore } from "@/features/auth/store";
import type { NotificationType } from "@/features/notifications/api/types";

type WsPayload = {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  data: Record<string, string>;
  created_at: string;
};

function deriveWsBaseUrl(): string {
  const apiUrl = config.apiUrl;
  const withoutPath = apiUrl.replace(/\/api\/v1\/?$/, "");
  return withoutPath.replace(/^http/, "ws");
}

const NOTIFICATION_QUERY_DEPS: Partial<Record<NotificationType, string[][]>> = {
  request_received: [["owner-requests"]],
  request_cancelled: [["owner-requests"]],
  request_approved: [["customer-requests"]],
  request_rejected: [["customer-requests"]],
  requests_auto_rejected: [["customer-requests"]],
  payment_submitted: [["admin-requests"]],
  payment_confirmed: [["customer-requests"], ["owner-requests"], ["transactions"]],
  rental_active: [["customer-requests"], ["owner-requests"]],
  rental_completed: [["customer-requests"], ["owner-requests"]],
  listing_submitted: [["admin-cars"], ["my-cars"]],
  listing_approved: [["admin-cars"], ["my-cars"]],
  listing_rejected: [["admin-cars"], ["my-cars"]],
  listing_needs_changes: [["admin-cars"], ["my-cars"]],
};

const PING_INTERVAL_MS = 25_000;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export function useNotificationsWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const unmountedRef = useRef(false);

  // Subscribe to auth state so we reconnect when token appears/changes
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  function clearPing() {
    if (pingTimerRef.current !== null) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }

  function closeSocket() {
    clearPing();
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }

  function handleMessage(event: MessageEvent) {
    if (event.data === "pong") return;

    let payload: WsPayload;
    try {
      payload = JSON.parse(event.data as string) as WsPayload;
    } catch {
      return;
    }

    console.log(
      `[WS] Notification received: ${payload.notification_type} — "${payload.title}" (${new Date().toLocaleTimeString()})`,
    );

    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });

    const deps = NOTIFICATION_QUERY_DEPS[payload.notification_type];
    if (deps) {
      deps.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    }
  }

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    // Already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const token =
      typeof window !== "undefined" ? window.__everythingcars_token : undefined;

    if (!token) {
      console.log("[WS] No token available, skipping connection");
      return;
    }

    const wsUrl = `${deriveWsBaseUrl()}/ws/notifications/?token=${token}`;
    console.log(`[WS] Connecting to ${wsUrl.replace(/token=.*/, "token=***")}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) {
        ws.close();
        return;
      }
      console.log(`[WS] Connected (${new Date().toLocaleTimeString()})`);
      backoffRef.current = INITIAL_BACKOFF_MS;

      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = handleMessage;

    ws.onclose = (e) => {
      clearPing();
      console.log(`[WS] Disconnected (code: ${e.code}, ${new Date().toLocaleTimeString()})`);
      if (unmountedRef.current) return;

      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      console.log(`[WS] Reconnecting in ${delay}ms...`);

      reconnectTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) {
          connect();
        }
      }, delay);
    };

    ws.onerror = () => {
      console.log(`[WS] Error (${new Date().toLocaleTimeString()})`);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    unmountedRef.current = false;

    if (isAuthenticated) {
      connect();
    } else {
      closeSocket();
    }

    return () => {
      unmountedRef.current = true;
      closeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
