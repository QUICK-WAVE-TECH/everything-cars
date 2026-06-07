"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AuthField,
  AuthButton,
  Checkbox,
  AuthShell,
} from "@/features/auth/components";
import { useSignUp } from "@/features/auth/api";
import { customerSignUpSchema, type CustomerSignUpInput } from "@/features/auth/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [agree, setAgree] = useState(false);
  const router = useRouter();
  const signUp = useSignUp();

  const form = useForm<CustomerSignUpInput>({
    resolver: zodResolver(customerSignUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      drivers_license: "",
      date_of_birth: "",
      address: "",
      state: "",
      city: "",
    },
  });

  const handleContinue = async () => {
    const valid = await form.trigger(["name", "email", "phone", "password", "confirmPassword"]);
    if (!valid) {
      const firstError = Object.values(form.formState.errors)[0];
      if (firstError?.message) toast.error(firstError.message);
      return;
    }
    setStep(2);
  };

  const handleSubmit = (values: CustomerSignUpInput) => {
    if (!agree) {
      toast.error("Please agree to the Terms & Conditions");
      return;
    }

    signUp.mutate(
      {
        role: "customer",
        email: values.email,
        name: values.name,
        password: values.password,
        phone: values.phone,
        drivers_license: values.drivers_license,
        date_of_birth: values.date_of_birth,
        address: values.address,
        state: values.state,
        city: values.city,
      },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          router.push(`/verify?email=${encodeURIComponent(data.email)}&purpose=sign_up_verify`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (step === 1) {
      event.preventDefault();
      void handleContinue();
      return;
    }

    void form.handleSubmit(handleSubmit)(event);
  };

  return (
    <AuthShell>
      <div className="flex w-[min(100%,632px)] flex-col items-center gap-8">
        <Card className="w-full rounded-2xl border-[0.5px] border-(--brc-border) p-6 shadow-xs sm:p-10">
          <CardContent className="flex flex-col gap-8 p-0">
            {/* Header + progress */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="m-0 text-[32px] leading-[1.2] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  Customer Sign Up
                </h1>
                <span className="text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Step {step} of 2
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-[2px] bg-(--brc-bg-muted)">
                <div
                  className={`h-full w-full origin-left rounded-[2px] bg-(--brc-primary) transition-transform duration-300 ${
                    step === 1 ? "scale-x-50" : "scale-x-100"
                  }`}
                />
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-8">
                {/* Step 1 */}
                {step === 1 ? (
                  <div className="flex flex-col gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Full Name" placeholder="First Name" value={field.value} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Email Address" placeholder="Email Address" value={field.value} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Phone Number" placeholder="Enter your phone number" value={field.value ?? ""} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Password" placeholder="Password" type="password" value={field.value} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Confirm Password" placeholder="Password" type="password" value={field.value} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <FormField control={form.control} name="drivers_license" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Driver's License" placeholder="Enter license number" value={field.value ?? ""} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Date of Birth" placeholder="dd/mm/yyyy" value={field.value ?? ""} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Address" placeholder="Enter your address" value={field.value ?? ""} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <AuthField label="State" placeholder="Select state" value={field.value ?? ""} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <AuthField label="City" placeholder="Select city" value={field.value ?? ""} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Checkbox checked={agree} onChange={() => setAgree(!agree)}>
                      I agree to the{" "}
                      <span className="text-(--brc-accent) underline">Terms &amp; Conditions</span>
                    </Checkbox>
                  </div>
                )}

                {/* Actions */}
                {step === 1 ? (
                  <AuthButton full iconEnd="arrow" onClick={handleContinue}>
                    Continue
                  </AuthButton>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <AuthButton variant="neutral" onClick={() => setStep(1)} className="w-[min(100%,120px)]">
                      Back
                    </AuthButton>
                    <AuthButton full type="submit" loading={signUp.isPending}>
                      {signUp.isPending ? "Creating Account..." : "Create Account"}
                    </AuthButton>
                  </div>
                )}
              </form>
            </Form>

            <div className="flex flex-wrap justify-center gap-2 text-base text-(--brc-text) [font-family:var(--brc-font-ui)]">
              <span>Already have an account?</span>
              <Link href="/sign-in" className="cursor-pointer p-0 text-base text-(--brc-accent) underline [font-family:var(--brc-font-link)]">
                Log In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
