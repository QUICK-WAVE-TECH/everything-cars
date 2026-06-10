"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRoundIcon, MailIcon, ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { AuthField, AuthButton, AuthShell } from "@/features/auth/components";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotInput = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: ForgotInput) => {
    setIsLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email: values.email });
      setSubmittedEmail(values.email);
      setSubmitted(true);
      toast.success("Reset link sent", {
        description: "Check your inbox for the password reset link.",
      });
    } catch {
      // Always show success — don't reveal if email exists
      setSubmittedEmail(values.email);
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const maskedEmail = submittedEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");

  if (submitted) {
    return (
      <AuthShell>
        <div className="flex w-[min(100%,520px)] flex-col items-center gap-6">
          <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={52} className="h-[52px] w-auto" />

          <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) shadow-xs">
            <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
              {/* Success icon */}
              <div className="relative flex size-[88px] items-center justify-center">
                <span className="absolute size-[72px] animate-ping rounded-full bg-(--brc-success) opacity-20" />
                <span className="absolute size-[88px] animate-pulse rounded-full bg-(--brc-success) opacity-10" />
                <div className="relative flex size-[72px] animate-[scaleIn_0.5s_ease-out] items-center justify-center rounded-full bg-(--brc-success-bg)">
                  <CheckCircle2Icon size={32} strokeWidth={1.8} className="text-(--brc-success)" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="m-0 text-2xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  Check Your Email
                </h1>
                <p className="m-0 text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="inline-flex items-center gap-1 font-medium text-(--brc-text)">
                    <MailIcon size={14} />
                    {maskedEmail}
                  </span>
                </p>
              </div>

              {/* Info box */}
              <div className="w-full rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 text-left">
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-sm leading-6 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                    The link will expire in <strong className="text-(--brc-text)">30 minutes</strong>. If you don&apos;t see the email, check your spam folder.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex w-full flex-col gap-3">
                <AuthButton
                  full
                  onClick={() => {
                    setSubmitted(false);
                    form.reset();
                  }}
                >
                  Try a Different Email
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

  return (
    <AuthShell>
      <div className="flex w-[min(100%,520px)] flex-col items-center gap-6">
        <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={52} className="h-[52px] w-auto" />

        <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) shadow-xs">
          <CardHeader className="flex flex-col items-center gap-4 pb-2 text-center">
            {/* Icon badge */}
            <div className="relative flex size-20 items-center justify-center">
              <span className="absolute size-20 animate-pulse rounded-full bg-(--brc-primary) opacity-15" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-(--brc-primary-tint)">
                <KeyRoundIcon size={28} strokeWidth={1.8} className="animate-[wiggle_2s_ease-in-out_infinite] text-(--brc-primary)" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                Forgot Password?
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                No worries — enter the email address linked to your account and we&apos;ll send you a reset link.
              </CardDescription>
            </div>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <CardContent className="flex flex-col gap-6 pt-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <AuthField
                        label="Email Address"
                        placeholder="Enter your email address"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <AuthButton full type="submit" loading={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
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
