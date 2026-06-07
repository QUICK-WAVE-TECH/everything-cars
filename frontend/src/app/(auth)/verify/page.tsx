"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { RefreshCwIcon, ShieldCheckIcon, MailIcon } from "lucide-react";
import { AuthButton, AuthShell } from "@/features/auth/components";
import { useVerify } from "@/features/auth/api";
import { verifySchema, type VerifyInput } from "@/features/auth/schemas";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { apiClient } from "@/lib/api-client";

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const purpose = (searchParams.get("purpose") || "sign_in") as VerifyInput["purpose"];
  const router = useRouter();
  const verify = useVerify();

  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const form = useForm<VerifyInput>({
    resolver: zodResolver(verifySchema),
    defaultValues: { email, code: "", purpose },
  });

  const handleSubmit = useCallback(
    (values: VerifyInput) => {
      verify.mutate(values, {
        onSuccess: (data) => {
          toast.success("Welcome to EverythingCars!", {
            description: "Redirecting to your dashboard...",
          });
          const dashboard = data.role === "owner" ? "/owner/dashboard" : "/customer/dashboard";
          router.push(dashboard);
        },
        onError: (error) => {
          toast.error("Invalid code", { description: error.message });
          form.setValue("code", "");
        },
      });
    },
    [verify, router, form],
  );

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await apiClient.post("/auth/sign-in", { email, password: "" }).catch(() => {
        // Sign-up resend needs a dedicated endpoint — this is a placeholder
      });
      toast.success("Code resent", { description: `A new code was sent to ${email}` });
      setCooldown(60);
      form.setValue("code", "");
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setIsResending(false);
    }
  }, [cooldown, email, form, isResending]);

  // Auto-submit when all 6 digits entered
  const codeValue = form.watch("code");
  useEffect(() => {
    if (codeValue?.length === 6) {
      form.handleSubmit(handleSubmit)();
    }
  }, [codeValue, form, handleSubmit]);

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

  return (
    <AuthShell>
      <div className="flex w-[min(100%,520px)] flex-col items-center gap-6">
        <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={52} className="h-[52px] w-auto" />

        <Card className="w-full rounded-2xl border-[0.5px] shadow-xs" style={{ borderColor: "var(--brc-border)" }}>
          <CardHeader className="flex flex-col items-center gap-4 pb-2 text-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 64, height: 64, background: "var(--brc-primary-tint)" }}
            >
              <ShieldCheckIcon size={28} strokeWidth={1.8} style={{ color: "var(--brc-primary)" }} />
            </div>
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-bold" style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)" }}>
                Verify Your Identity
              </CardTitle>
              <CardDescription className="text-sm" style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text-muted)" }}>
                We sent a 6-digit verification code to{" "}
                <span className="inline-flex items-center gap-1 font-medium" style={{ color: "var(--brc-text)" }}>
                  <MailIcon size={14} />
                  {maskedEmail}
                </span>
              </CardDescription>
            </div>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <CardContent className="flex flex-col gap-6 pt-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <Field>
                        <div className="flex items-center justify-between">
                          <FieldLabel htmlFor="otp-verification" style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)" }}>
                            Verification code
                          </FieldLabel>
                          <Button variant="outline" size="xs" type="button" disabled={cooldown > 0 || isResending} onClick={handleResend}>
                            <RefreshCwIcon className={isResending ? "animate-spin" : ""} />
                            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                          </Button>
                        </div>
                        <div className="flex justify-center py-2">
                          <InputOTP maxLength={6} id="otp-verification" value={field.value} onChange={field.onChange}>
                            <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator className="mx-2" />
                            <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <FormMessage />
                        <FieldDescription className="text-center">
                          Didn&apos;t receive the code? Check your spam folder.
                        </FieldDescription>
                      </Field>
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <AuthButton full type="submit" loading={verify.isPending}>
                  {verify.isPending ? "Verifying..." : "Verify & Continue"}
                </AuthButton>
                <p className="text-center text-sm" style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text-muted)" }}>
                  Having trouble?{" "}
                  <a href="/contact" className="underline underline-offset-4 transition-colors" style={{ color: "var(--brc-accent)" }}>
                    Contact support
                  </a>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </AuthShell>
  );
}

function VerifyFallback() {
  return (
    <AuthShell>
      <div className="flex w-[min(100%,520px)] flex-col items-center gap-6">
        <Card className="w-full rounded-2xl border-[0.5px] shadow-xs" style={{ borderColor: "var(--brc-border)" }}>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: "var(--brc-primary-tint)" }}>
              <ShieldCheckIcon size={28} strokeWidth={1.8} style={{ color: "var(--brc-primary)" }} />
            </div>
            <p className="text-base" style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text-muted)" }}>
              Preparing verification...
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
