"use client";

import { useCallback, useEffect, useRef } from "react";
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
  request_received: [["requests", "owner"]],
  request_cancelled: [["requests", "owner"]],
  request_approved: [["requests", "customer"]],
  request_rejected: [["requests", "customer"]],
  requests_auto_rejected: [["requests", "customer"]],
  payment_submitted: [["requests", "admin"]],
  payment_confirmed: [
    ["requests", "customer"],
    ["requests", "owner"],
    ["transactions"],
  ],
  rental_active: [["requests", "customer"], ["requests", "owner"]],
  rental_completed: [["requests", "customer"], ["requests", "owner"]],
  listing_suspended: [["cars", "admin"], ["cars", "owner"], ["cars", "public"]],
  listing_approved: [["cars", "owner"], ["inspections", "car-history"]],
  listing_submitted: [["cars", "admin"]],
  changes_requested: [["cars", "owner"], ["inspections", "car-history"]],
  // A new booking occupies a slot — refresh the staff calendar counts and the
  // owner/staff available-slot lists so the taken spot disappears live.
  inspection_booked: [
    ["inspections", "admin-bookings"],
    ["inspections", "slots"],
    ["inspections", "available-slots"],
    ["cars", "admin"],
  ],
  inspection_booking_approved: [["cars", "owner"], ["inspections", "bookings"]],
  // Rejecting frees the slot — the calendar count drops and the spot reopens.
  inspection_booking_rejected: [
    ["cars", "owner"],
    ["inspections", "bookings"],
    ["inspections", "slots"],
    ["inspections", "available-slots"],
  ],
  inspection_started: [
    ["cars", "owner"],
    ["inspections", "bookings"],
    ["inspections", "car-history"],
  ],
  needs_clearance: [
    ["cars", "owner"],
    ["inspections", "bookings"],
    ["inspections", "car-history"],
  ],
  clearance_response: [["cars", "admin"], ["inspections", "admin-bookings"]],
  inspection_passed: [
    ["cars", "owner"],
    ["cars", "public"],
    ["inspections", "bookings"],
    ["inspections", "car-history"],
  ],
  inspection_failed: [
    ["cars", "owner"],
    ["inspections", "bookings"],
    ["inspections", "car-history"],
  ],
  // A no-show is recorded only after the appointment time, so its slot is
  // already in the past — it changes neither the calendar's OCCUPIED count nor
  // the future-only available-slots set. No slot keys needed.
  inspection_no_show: [
    ["cars", "owner"],
    ["inspections", "bookings"],
    ["inspections", "car-history"],
  ],
  // Reschedule frees the old slot and takes a new one — refresh both the
  // calendar counts and the available-slot lists.
  inspection_rescheduled: [
    ["inspections", "admin-bookings"],
    ["inspections", "slots"],
    ["inspections", "available-slots"],
    ["cars", "admin"],
  ],
  // Owner cancellation frees the slot and returns the car to bookable.
  inspection_cancelled: [
    ["inspections", "admin-bookings"],
    ["inspections", "slots"],
    ["inspections", "available-slots"],
    ["cars", "admin"],
  ],
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
  const connectRef = useRef<(() => void) | null>(null);

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

  const handleMessage = useCallback((event: MessageEvent) => {
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
  }, []);

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
          connectRef.current?.();
        }
      }, delay);
    };

    ws.onerror = () => {
      console.log(`[WS] Error (${new Date().toLocaleTimeString()})`);
      ws.close();
    };
  }, [handleMessage]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

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
