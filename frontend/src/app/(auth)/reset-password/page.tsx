"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { LockKeyholeIcon, CheckCircle2Icon, ArrowLeftIcon, ShieldAlertIcon } from "lucide-react";
import { AuthField, AuthButton, AuthShell } from "@/features/auth/components";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetInput = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetContent />
    </Suspense>
  );
}

function ResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [status, setStatus] = useState<"form" | "success" | "expired">(
    token ? "form" : "expired"
  );
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleSubmit = async (values: ResetInput) => {
    setIsLoading(true);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        password: values.password,
      });
      setStatus("success");
      toast.success("Password reset successfully");
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const data = error.data as { detail?: string; password?: string[] } | undefined;
        if (data?.password) {
          // Password validation error — show the message, don't mark as expired
          toast.error(data.password[0] ?? "Password does not meet requirements");
        } else {
          // Token expired/invalid
          setStatus("expired");
          toast.error("Reset link expired", {
            description: "Please request a new password reset link.",
          });
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (status === "success") {
    return (
      <AuthShell>
        <div className="flex w-[min(100%,520px)] flex-col items-center gap-6">
          <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={52} className="h-[52px] w-auto" />
          <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) shadow-xs">
            <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
              <div className="relative flex size-[88px] items-center justify-center">
                <span className="absolute size-[72px] animate-ping rounded-full bg-(--brc-success) opacity-20" />
                <span className="absolute size-[88px] animate-pulse rounded-full bg-(--brc-success) opacity-10" />
                <div className="relative flex size-[72px] animate-[scaleIn_0.5s_ease-out] items-center justify-center rounded-full bg-(--brc-success-bg)">
                  <CheckCircle2Icon size={32} strokeWidth={1.8} className="text-(--brc-success)" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="m-0 text-2xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  Password Reset Complete
                </h1>
                <p className="m-0 text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
              </div>
              <AuthButton full onClick={() => router.push("/sign-in")}>
                Sign In
              </AuthButton>
            </CardContent>
          </Card>
        </div>
      </AuthShell>
    );
  }

  // Expired/invalid token state
  if (status === "expired") {
    return (
      <AuthShell>
        <div className="flex w-[min(100%,520px)] flex-col items-center gap-6">
          <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={52} className="h-[52px] w-auto" />
          <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) shadow-xs">
            <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
              <div className="relative flex size-20 items-center justify-center">
                <span className="absolute size-20 animate-pulse rounded-full bg-(--brc-danger) opacity-10" />
                <div className="relative flex size-16 items-center justify-center rounded-full bg-(--brc-danger-bg)">
                  <ShieldAlertIcon size={28} strokeWidth={1.8} className="text-(--brc-danger)" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="m-0 text-2xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  Link Expired
                </h1>
                <p className="m-0 text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3">
                <AuthButton full onClick={() => router.push("/forgot-password")}>
                  Request New Link
                </AuthButton>
                <Link
                  href="/sign-in"
                  className="group inline-flex items-center justify-center gap-2 text-sm font-semibold text-(--brc-text-muted) no-underline transition-colors hover:text-(--brc-text) [font-family:var(--brc-font-ui)]"
                >
                  <ArrowLeftIcon size={15} className="transition-transform duration-200 group-hover:-translate-x-1" />
                  Back to Sign In
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthShell>
    );
  }

  // Form state
  return (
    <AuthShell>
      <div className="flex w-[min(100%,520px)] flex-col items-center gap-6">
        <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={52} className="h-[52px] w-auto" />
        <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) shadow-xs">
          <CardHeader className="flex flex-col items-center gap-4 pb-2 text-center">
            <div className="relative flex size-20 items-center justify-center">
              <span className="absolute size-20 animate-pulse rounded-full bg-(--brc-primary) opacity-15" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-(--brc-primary-tint)">
                <LockKeyholeIcon size={28} strokeWidth={1.8} className="text-(--brc-primary)" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                Set New Password
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                Choose a strong password that you haven&apos;t used before. Must be at least 8 characters.
              </CardDescription>
            </div>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <CardContent className="flex flex-col gap-6 pt-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <AuthField
                        label="New Password"
                        placeholder="Enter new password"
                        type="password"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <AuthField
                        label="Confirm Password"
                        placeholder="Confirm new password"
                        type="password"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <AuthButton full type="submit" loading={isLoading}>
                  {isLoading ? "Resetting..." : "Reset Password"}
                </AuthButton>

                <Link
                  href="/sign-in"
                  className="group inline-flex items-center justify-center gap-2 text-sm font-semibold text-(--brc-text-muted) no-underline transition-colors hover:text-(--brc-text) [font-family:var(--brc-font-ui)]"
                >
                  <ArrowLeftIcon size={15} className="transition-transform duration-200 group-hover:-translate-x-1" />
                  Back to Sign In
                </Link>
              </CardContent>
            </form>
          </Form>
        </Card>
      </div>
    </AuthShell>
  );
}

function ResetFallback() {
  return (
    <AuthShell>
      <div className="flex w-[min(100%,520px)] flex-col items-center gap-6">
        <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) shadow-xs">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="relative flex size-20 items-center justify-center">
              <span className="absolute size-20 animate-pulse rounded-full bg-(--brc-primary) opacity-15" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-(--brc-primary-tint)">
                <LockKeyholeIcon size={28} strokeWidth={1.8} className="text-(--brc-primary)" />
              </div>
            </div>
            <p className="text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Preparing password reset...
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
