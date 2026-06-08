"use client";

import { useState, useEffect, type FormEvent } from "react";
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
  CountrySelect,
  StateSelect,
  CityCombobox,
  PhoneField,
} from "@/features/auth/components";
import { COUNTRIES } from "@/features/auth/data/countries";
import { useSignUp } from "@/features/auth/api";
import {
  customerSignUpSchema,
  type CustomerSignUpInput,
} from "@/features/auth/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [agree, setAgree] = useState(false);
  const [phoneCode, setPhoneCode] = useState("+234"); // Default Nigeria
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
      country: "",
    },
  });

  // Resolve country name from iso for geo API
  const countryIso = form.watch("country");
  const countryName = COUNTRIES.find((c) => c.iso === countryIso)?.name ?? "";
  const countryDial = COUNTRIES.find((c) => c.iso === countryIso)?.dial;

  // When country changes, auto-sync phone code
  useEffect(() => {
    if (countryDial) setPhoneCode(countryDial);
  }, [countryDial]);

  // When country changes, reset state and city
  useEffect(() => {
    form.setValue("state", "");
    form.setValue("city", "");
  }, [countryIso, form]);

  const handleContinue = async () => {
    const valid = await form.trigger([
      "name",
      "email",
      "phone",
      "password",
      "confirmPassword",
    ]);
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
          router.push(
            `/verify?email=${encodeURIComponent(data.email)}&purpose=sign_up_verify`,
          );
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
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Full Name"
                            placeholder="First Name"
                            value={field.value}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <PhoneField
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            code={phoneCode}
                            onCodeChange={setPhoneCode}
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
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Confirm Password"
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
                ) : (
                  <div className="flex flex-col gap-4">
                    <FormField
                      control={form.control}
                      name="drivers_license"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Driver's License"
                            placeholder="Enter license number"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex flex-col gap-2">
                            <span
                              style={{
                                fontFamily: "var(--brc-font-ui)",
                                fontSize: 16,
                                color: "var(--brc-text)",
                              }}
                            >
                              Date of Birth
                            </span>
                            <Popover>
                              <PopoverTrigger>
                                <div
                                  className="flex h-14 w-full items-center justify-between rounded-lg px-6 text-left text-sm"
                                  style={{
                                    background: "var(--brc-bg-subtle)",
                                    border: "1px solid var(--brc-border)",
                                    fontFamily: "var(--brc-font-ui)",
                                    color: field.value
                                      ? "var(--brc-text)"
                                      : "var(--brc-text-muted)",
                                  }}
                                >
                                  {field.value
                                    ? format(
                                        new Date(field.value),
                                        "dd/MM/yyyy",
                                      )
                                    : "Select date of birth"}
                                  <CalendarIcon
                                    size={18}
                                    style={{ color: "var(--brc-text-muted)" }}
                                  />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                                style={{
                                  background: "rgba(255, 255, 255, 0.85)",
                                  backdropFilter: "blur(16px) saturate(180%)",
                                  WebkitBackdropFilter:
                                    "blur(16px) saturate(180%)",
                                  border:
                                    "1px solid rgba(255, 255, 255, 0.3)",
                                  borderRadius: "var(--brc-radius-lg)",
                                  boxShadow:
                                    "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
                                }}
                              >
                                <Calendar
                                  className="p-3 [&_.rdp-month]:space-y-4 [&_.rdp-caption_label]:font-medium [&_.rdp-nav]:space-x-1 [&_.rdp-day_button]:h-9 [&_.rdp-day_button]:w-9 [&_.rdp-day_button]:rounded-lg [&_.rdp-day_button]:text-sm [&_.rdp-day_button:hover]:bg-[var(--brc-primary-tint)] [&_.rdp-day_selected_.rdp-day_button]:bg-[var(--brc-primary)] [&_.rdp-day_selected_.rdp-day_button]:text-white [&_.rdp-day_today_.rdp-day_button]:border [&_.rdp-day_today_.rdp-day_button]:border-[var(--brc-primary)] [&_select]:rounded-md [&_select]:border [&_select]:border-[var(--brc-border)] [&_select]:bg-white [&_select]:px-2 [&_select]:py-1 [&_select]:text-sm"
                                  mode="single"
                                  selected={
                                    field.value
                                      ? new Date(field.value)
                                      : undefined
                                  }
                                  onSelect={(date) =>
                                    field.onChange(
                                      date ? format(date, "yyyy-MM-dd") : "",
                                    )
                                  }
                                  disabled={(date) =>
                                    date > new Date() ||
                                    date < new Date("1920-01-01")
                                  }
                                  defaultMonth={
                                    field.value
                                      ? new Date(field.value)
                                      : new Date(2000, 0)
                                  }
                                  captionLayout="dropdown"
                                  startMonth={new Date(1920, 0)}
                                  endMonth={new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <CountrySelect
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <StateSelect
                            country={countryName}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <CityCombobox
                            country={countryName}
                            state={form.watch("state") ?? ""}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Address"
                            placeholder="Enter your address"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Checkbox checked={agree} onChange={() => setAgree(!agree)}>
                      I agree to the{" "}
                      <span className="text-(--brc-accent) underline">
                        Terms &amp; Conditions
                      </span>
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
                    <AuthButton
                      variant="neutral"
                      onClick={() => setStep(1)}
                      className="w-[min(100%,120px)]"
                    >
                      Back
                    </AuthButton>
                    <AuthButton full type="submit" loading={signUp.isPending}>
                      {signUp.isPending
                        ? "Creating Account..."
                        : "Create Account"}
                    </AuthButton>
                  </div>
                )}
              </form>
            </Form>

            <div className="flex flex-wrap justify-center gap-2 text-base text-(--brc-text) [font-family:var(--brc-font-ui)]">
              <span>Already have an account?</span>
              <Link
                href="/sign-in"
                className="cursor-pointer p-0 text-base text-(--brc-accent) underline [font-family:var(--brc-font-link)]"
              >
                Log In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
