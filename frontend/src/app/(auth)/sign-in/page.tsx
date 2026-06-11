"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthField, AuthButton, AuthShell } from "@/features/auth/components";
import { useSignIn } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { signInSchema, type SignInInput } from "@/features/auth/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";

export default function SignInPage() {
  const router = useRouter();
  const signIn = useSignIn();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = (values: SignInInput) => {
    signIn.mutate(values, {
      onSuccess: (data) => {
        toast.success(data.message);
        router.push(
          `/verify?email=${encodeURIComponent(data.email)}&purpose=sign_in`,
        );
      },
      onError: (error) => {
        // Handle unverified account — backend sends 403 with requires_verification
        if (error instanceof ApiError && error.status === 403 && error.data) {
          const data = error.data as { email?: string; requires_verification?: boolean };
          if (data.requires_verification && data.email) {
            toast.info("Account not verified", {
              description: "A new verification code has been sent to your email.",
            });
            router.push(`/verify?email=${encodeURIComponent(data.email)}&purpose=sign_up_verify`);
            return;
          }
        }
        toast.error(error.message);
      },
    });
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;
    if (!(event.target instanceof HTMLInputElement)) return;

    event.preventDefault();
    if (!signIn.isPending) {
      void form.handleSubmit(handleSubmit)();
    }
  };

  return (
    <AuthShell>
      <div className="flex w-[min(100%,632px)] flex-col items-center gap-8">
        <Image
          src="/logo.png"
          alt="Buy & Rent Cars"
          width={170}
          height={52}
          className="h-[52px] w-auto"
        />
        <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) p-6 shadow-xs sm:p-10">
          <CardContent className="flex flex-col gap-8 p-0">
            <h1 className="m-0 text-[32px] leading-[1.2] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              Welcome Back
            </h1>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                onKeyDown={handleFormKeyDown}
                className="flex flex-col gap-8"
              >
                <div className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <AuthField
                          label="Email Address"
                          placeholder="Email Address"
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <AuthField
                          label="Password"
                          placeholder="Password"
                          type="password"
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end -mt-2">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-(--brc-accent) underline underline-offset-4 transition-colors hover:text-(--brc-accent-deep) [font-family:var(--brc-font-link)]"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <AuthButton full type="submit" loading={signIn.isPending}>
                  {signIn.isPending ? "Signing in..." : "Continue"}
                </AuthButton>
              </form>
            </Form>

            <div className="flex flex-wrap justify-center gap-2 text-base text-(--brc-text) [font-family:var(--brc-font-ui)]">
              <span>Don&apos;t have an account?</span>
              <Link
                href="/get-started"
                className="cursor-pointer p-0 text-base text-(--brc-accent) underline [font-family:var(--brc-font-link)]"
              >
                Sign Up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
