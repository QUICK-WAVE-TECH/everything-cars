"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

const CROSSFADE = { type: "spring", stiffness: 260, damping: 34, mass: 0.8 } as const;
const INSTANT = { duration: 0 } as const;

export type AsyncActionStatus = "idle" | "pending" | "success" | "error";

export type UseAsyncActionOptions = {
  action: () => unknown;
  resetAfter?: number;
  onError?: (error: unknown) => void;
};

/** Runs an async action and tracks idle → pending → success | error, auto-
 * resetting to idle after `resetAfter`ms. Guards against double-runs and
 * against setting state after unmount / a newer run. */
export function useAsyncAction({
  action,
  resetAfter = 1400,
  onError,
}: UseAsyncActionOptions) {
  const [status, setStatus] = useState<AsyncActionStatus>("idle");

  const phase = useRef<AsyncActionStatus>("idle");
  const runId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const act = useRef(action);
  const fail = useRef(onError);

  useEffect(() => {
    act.current = action;
    fail.current = onError;
  });

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    runId.current += 1;
    clear();
    phase.current = "idle";
    setStatus("idle");
  }, [clear]);

  const run = useCallback(() => {
    if (phase.current === "pending") return;

    clear();
    const id = ++runId.current;
    phase.current = "pending";
    setStatus("pending");

    const settle = (next: "success" | "error") => {
      if (!alive.current || id !== runId.current) return;
      clear();
      phase.current = next;
      setStatus(next);
      timer.current = setTimeout(() => {
        if (!alive.current || id !== runId.current) return;
        phase.current = "idle";
        setStatus("idle");
      }, resetAfter);
    };

    Promise.resolve()
      .then(() => act.current())
      .then(
        () => settle("success"),
        (error: unknown) => {
          fail.current?.(error);
          settle("error");
        },
      );
  }, [clear, resetAfter]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clear();
    };
  }, [clear]);

  return { status, run, reset, pending: status === "pending" };
}

/** The crossfading spinner + label at the heart of a loading button. Exposed on
 * its own so alert-dialog actions and other bespoke buttons can share the exact
 * same effect. Faces overlap in one grid cell so the button never resizes as the
 * label changes. Success/error tint the whole face with a brand colour — legible
 * on both the dark primary and the light outline/ghost variants. Reduced motion
 * swaps instantly. Include `successLabel`/`errorLabel` only when those states are
 * reachable, so they don't reserve width on a plain pending button. */
export function MorphingLabel({
  status,
  idle,
  pendingLabel,
  successLabel,
  errorLabel,
}: {
  status: AsyncActionStatus;
  idle: React.ReactNode;
  pendingLabel?: React.ReactNode;
  successLabel?: React.ReactNode;
  errorLabel?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const fade = reduced ? INSTANT : CROSSFADE;
  const spin = cn("size-3.5", !reduced && "animate-spin");

  const faces = [
    { key: "idle" as const, node: idle, tone: undefined, icon: null },
    {
      key: "pending" as const,
      node: pendingLabel ?? idle,
      tone: undefined,
      icon: <Loader2Icon className={spin} aria-hidden="true" />,
    },
    ...(successLabel !== undefined
      ? [
          {
            key: "success" as const,
            node: successLabel,
            tone: "text-(--brc-success)",
            icon: <CheckIcon className="size-3.5" aria-hidden="true" />,
          },
        ]
      : []),
    ...(errorLabel !== undefined
      ? [
          {
            key: "error" as const,
            node: errorLabel,
            tone: "text-(--brc-danger)",
            icon: <TriangleAlertIcon className="size-3.5" aria-hidden="true" />,
          },
        ]
      : []),
  ];

  return (
    <span className="relative grid place-items-center">
      {faces.map((face) => (
        <motion.span
          key={face.key}
          // Only the active face is exposed to assistive tech, so the button
          // keeps a single, correct accessible name as the label morphs.
          aria-hidden={face.key !== status || undefined}
          initial={false}
          animate={
            face.key === status
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 3, filter: "blur(3px)" }
          }
          transition={fade}
          className={cn(
            "col-start-1 row-start-1 flex items-center justify-center gap-1.5 whitespace-nowrap",
            face.tone,
          )}
        >
          {face.icon}
          {face.node}
        </motion.span>
      ))}
    </span>
  );
}

export type LoadingButtonProps = {
  children: React.ReactNode;
  pendingLabel?: React.ReactNode;
  successLabel?: React.ReactNode;
  errorLabel?: React.ReactNode;
  /** Controlled pending state (e.g. a react-query mutation's `isPending`). When
   * provided, the button reflects it and success/error faces are not shown. */
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Self-managed mode: run this async action and show success/error yourself.
   * Ignored when `loading` is provided. */
  onAction?: () => unknown;
  resetAfter?: number;
  onError?: (error: unknown) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
} & VariantProps<typeof buttonVariants>;

/** A drop-in for our `Button` that animates a spinner + label crossfade while
 * an action is in flight — and, in self-managed mode, a success/error flourish.
 * Reduced-motion falls back to an instant swap. */
export function LoadingButton({
  children,
  pendingLabel,
  successLabel = "Done",
  errorLabel = "Try again",
  loading,
  onClick,
  onAction,
  resetAfter = 1400,
  onError,
  disabled = false,
  type = "button",
  variant,
  size = "lg",
  className,
}: LoadingButtonProps) {
  const selfManaged = loading === undefined && typeof onAction === "function";

  const runner = useAsyncAction({
    action: onAction ?? (() => undefined),
    resetAfter,
    onError,
  });

  const status: AsyncActionStatus = selfManaged
    ? runner.status
    : loading
      ? "pending"
      : "idle";
  const pending = status === "pending";

  const announce =
    status === "success"
      ? successLabel
      : status === "error"
        ? errorLabel
        : "";

  return (
    <>
      <Button
        type={type}
        variant={variant}
        size={size}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        className={cn("relative", className)}
        onClick={(event) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          if (selfManaged) {
            runner.run();
            return;
          }
          onClick?.(event);
        }}
      >
        <MorphingLabel
          status={status}
          idle={children}
          pendingLabel={pendingLabel}
          successLabel={selfManaged ? successLabel : undefined}
          errorLabel={selfManaged ? errorLabel : undefined}
        />
      </Button>

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </>
  );
}

export default LoadingButton;
