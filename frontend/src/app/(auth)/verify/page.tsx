"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthField, AuthButton, AuthShell } from "@/features/auth/components";
import { useVerify } from "@/features/auth/api";
import { verifySchema, type VerifyInput } from "@/features/auth/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";

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

  const form = useForm<VerifyInput>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email,
      code: "",
      purpose,
    },
  });

  const handleSubmit = (values: VerifyInput) => {
    verify.mutate(values, {
      onSuccess: (data) => {
        toast.success("Welcome to EverythingCars!");
        const dashboard = data.role === "owner" ? "/owner/dashboard" : "/customer/dashboard";
        router.push(dashboard);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <AuthShell>
      <div className="flex w-[min(100%,632px)] flex-col items-center gap-8">
        <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) p-6 shadow-xs sm:p-10">
          <CardContent className="flex flex-col gap-8 p-0">
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[32px] leading-[1.2] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                Verify Your Identity
              </h1>
              <p className="m-0 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                We sent a 6-digit code to{" "}
                <strong className="text-(--brc-text)">{email}</strong>. Enter it below to continue.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-8">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <AuthField
                        label="Access Code"
                        placeholder="Enter 6-digit code"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <AuthButton full type="submit" loading={verify.isPending}>
                  {verify.isPending ? "Verifying..." : "Verify"}
                </AuthButton>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}

function VerifyFallback() {
  return (
    <AuthShell>
      <div className="flex w-[min(100%,632px)] flex-col items-center gap-8">
        <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) p-6 shadow-xs sm:p-10">
          <CardContent className="flex flex-col gap-8 p-0">
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[32px] leading-[1.2] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                Verify Your Identity
              </h1>
              <p className="m-0 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                Preparing your verification form...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
