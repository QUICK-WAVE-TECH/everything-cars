"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { AuthButton, AuthShell } from "@/features/auth/components";
import { useVerify } from "@/features/auth/api";
import { ApiError, apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const code = searchParams.get("code") || "";

  const verify = useVerify();
  const hasRun = useRef(false);

  const [throttledUntil, setThrottledUntil] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Auto-verify once on mount. Guarded with a ref so React strict-mode's
  // double-invoke (and any re-render) can't fire the mutation twice.
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!email || !code) return;

    verify.mutate({ email, code, purpose: "sign_up_verify" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Throttle countdown for the resend action.
  useEffect(() => {
    if (throttledUntil <= 0) return;
    const timer = setTimeout(() => setThrottledUntil((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [throttledUntil]);

  // Redirect to the dashboard a short beat after a successful auto-verify —
  // useVerify's onSuccess already calls setAuth, this just gives the success
  // state a moment to be seen before navigating away.
  useEffect(() => {
    if (!verify.isSuccess || !verify.data) return;
    const dashboard =
      verify.data.role === "owner" ? "/owner/dashboard" : "/customer/dashboard";
    const timer = setTimeout(() => router.push(dashboard), 1200);
    return () => clearTimeout(timer);
  }, [verify.isSuccess, verify.data, router]);

  const handleResend = useCallback(async () => {
    if (!email || isResending || throttledUntil > 0) return;
    setIsResending(true);
    try {
      await apiClient.post("/auth/resend", {
        email,
        purpose: "sign_up_verify",
      });
      toast.success("Verification email sent", {
        description: `Check ${email} for a new link.`,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        const wait = error.retryAfter || 60;
        setThrottledUntil(wait);
        toast.error("Too many requests", {
          description: `Please wait ${wait} seconds before trying again.`,
        });
      } else {
        toast.error("Failed to resend email");
      }
    } finally {
      setIsResending(false);
    }
  }, [email, isResending, throttledUntil]);

  const missingParams = !email || !code;
  const status: "verifying" | "success" | "error" = missingParams
    ? "error"
    : verify.isSuccess
      ? "success"
      : verify.isError
        ? "error"
        : "verifying";

  return (
    <AuthShell>
      <div className="flex w-[min(100%,480px)] flex-col items-center gap-6">
        <Image
          src="/logo.png"
          alt="Buy & Rent Cars"
          width={170}
          height={52}
          className="h-[52px] w-auto"
        />

        <Card
          className="w-full rounded-2xl border-[0.5px] shadow-xs"
          style={{ borderColor: "var(--brc-border)" }}
        >
          <CardHeader className="flex flex-col items-center gap-4 pb-2 text-center">
            <StatusIcon status={status} />
          </CardHeader>

          <CardContent
            className="flex flex-col items-center gap-6 pb-8 text-center"
            aria-live="polite"
          >
            {status === "verifying" && (
              <div className="flex flex-col gap-2">
                <CardTitle
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "var(--brc-font-ui)",
                    color: "var(--brc-text)",
                  }}
                >
                  Verifying your account…
                </CardTitle>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: "var(--brc-font-ui)",
                    color: "var(--brc-text-muted)",
                  }}
                >
                  Hang tight, this only takes a moment.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col gap-2">
                <CardTitle
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "var(--brc-font-ui)",
                    color: "var(--brc-text)",
                  }}
                >
                  You&apos;re verified!
                </CardTitle>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: "var(--brc-font-ui)",
                    color: "var(--brc-text-muted)",
                  }}
                >
                  Redirecting you to your dashboard…
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex w-full flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <CardTitle
                    className="text-xl font-bold"
                    style={{
                      fontFamily: "var(--brc-font-ui)",
                      color: "var(--brc-text)",
                    }}
                  >
                    This link is invalid or has expired
                  </CardTitle>
                  <p
                    className="text-sm"
                    style={{
                      fontFamily: "var(--brc-font-ui)",
                      color: "var(--brc-text-muted)",
                    }}
                  >
                    {missingParams
                      ? "This verification link is missing some information. Try resending it below."
                      : "This verification link is invalid or has expired. You can request a new one below."}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3">
                  <AuthButton
                    full
                    type="button"
                    loading={isResending}
                    disabled={!email || throttledUntil > 0 || isResending}
                    onClick={handleResend}
                  >
                    {throttledUntil > 0 ? (
                      `Resend link in ${throttledUntil}s`
                    ) : isResending ? (
                      "Sending..."
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <RefreshCwIcon size={16} />
                        Resend link
                      </span>
                    )}
                  </AuthButton>

                  {email && (
                    <a
                      href={`/verify?email=${encodeURIComponent(email)}&purpose=sign_up_verify`}
                      className="text-center text-sm underline underline-offset-4 transition-colors"
                      style={{
                        fontFamily: "var(--brc-font-ui)",
                        color: "var(--brc-accent)",
                      }}
                    >
                      Enter the code manually
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}

function StatusIcon({
  status,
}: {
  status: "verifying" | "success" | "error";
}) {
  if (status === "success") {
    return (
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 64,
          height: 64,
          background: "var(--brc-primary-tint)",
        }}
      >
        <CheckCircle2Icon
          size={30}
          strokeWidth={1.8}
          style={{ color: "var(--brc-primary)" }}
        />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 64,
          height: 64,
          background: "color-mix(in srgb, var(--brc-danger) 12%, transparent)",
        }}
      >
        <XCircleIcon
          size={30}
          strokeWidth={1.8}
          style={{ color: "var(--brc-danger)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: 64,
        height: 64,
        background: "var(--brc-primary-tint)",
      }}
    >
      <Loader2Icon
        size={30}
        strokeWidth={1.8}
        className="animate-spin motion-reduce:animate-none"
        style={{ color: "var(--brc-primary)" }}
      />
    </div>
  );
}

function VerifyEmailFallback() {
  return (
    <AuthShell>
      <div className="flex w-[min(100%,480px)] flex-col items-center gap-6">
        <Card
          className="w-full rounded-2xl border-[0.5px] shadow-xs"
          style={{ borderColor: "var(--brc-border)" }}
        >
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Loader2Icon
              size={30}
              strokeWidth={1.8}
              className="animate-spin motion-reduce:animate-none"
              style={{ color: "var(--brc-primary)" }}
            />
            <p
              className="text-base"
              style={{
                fontFamily: "var(--brc-font-ui)",
                color: "var(--brc-text-muted)",
              }}
            >
              Preparing verification...
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
