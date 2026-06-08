"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MIN_BIRTH_YEAR = 1920;
const DEFAULT_BIRTH_MONTH = new Date(2000, 0);

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [agree, setAgree] = useState(false);
  const [phoneCode, setPhoneCode] = useState("+234"); // Default Nigeria
  const [birthMonth, setBirthMonth] = useState(DEFAULT_BIRTH_MONTH);
  const [birthYearInput, setBirthYearInput] = useState(
    String(DEFAULT_BIRTH_MONTH.getFullYear()),
  );
  const router = useRouter();
  const signUp = useSignUp();
  const today = new Date();
  const maxBirthYear = today.getFullYear();
  const maxBirthMonth = today.getMonth();

  const form = useForm<CustomerSignUpInput>({
    resolver: zodResolver(customerSignUpSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
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
  const countryIso = useWatch({
    control: form.control,
    name: "country",
  });
  const stateName = useWatch({
    control: form.control,
    name: "state",
  });
  const countryName = COUNTRIES.find((c) => c.iso === countryIso)?.name ?? "";
  const handleCountryChange = (value: string, onChange: (value: string) => void) => {
    onChange(value);
    const dial = COUNTRIES.find((country) => country.iso === value)?.dial;
    if (dial) setPhoneCode(dial);
    form.setValue("state", "");
    form.setValue("city", "");
  };
  const getSafeBirthMonth = (year: number, month: number) => {
    const safeYear = Math.min(Math.max(year, MIN_BIRTH_YEAR), maxBirthYear);
    const safeMonth =
      safeYear === maxBirthYear ? Math.min(month, maxBirthMonth) : month;

    return new Date(safeYear, safeMonth, 1);
  };
  const updateBirthMonth = (date: Date) => {
    const nextMonth = getSafeBirthMonth(date.getFullYear(), date.getMonth());

    setBirthMonth(nextMonth);
    setBirthYearInput(String(nextMonth.getFullYear()));
  };
  const handleBirthYearInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);

    setBirthYearInput(digits);
    if (digits.length === 4) {
      updateBirthMonth(getSafeBirthMonth(Number(digits), birthMonth.getMonth()));
    }
  };
  const commitBirthYearInput = () => {
    const parsedYear = Number(birthYearInput);
    updateBirthMonth(
      getSafeBirthMonth(
        Number.isFinite(parsedYear) ? parsedYear : birthMonth.getFullYear(),
        birthMonth.getMonth(),
      ),
    );
  };

  const handleContinue = async () => {
    const valid = await form.trigger([
      "first_name",
      "last_name",
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
        first_name: values.first_name,
        last_name: values.last_name,
        password: values.password,
        phone: values.phone,
        drivers_license: values.drivers_license,
        date_of_birth: values.date_of_birth,
        address: values.address,
        state: values.state,
        city: values.city,
        country: values.country,
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
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="First Name"
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
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Last Name"
                            placeholder="Last Name"
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
                                className="w-[calc(100vw-2rem)] max-w-80 p-0 sm:w-auto"
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
                                <div className="flex items-center justify-end border-b border-(--brc-border) px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      aria-label="Previous year"
                                      disabled={
                                        birthMonth.getFullYear() <=
                                        MIN_BIRTH_YEAR
                                      }
                                      onClick={() =>
                                        updateBirthMonth(
                                          new Date(
                                            birthMonth.getFullYear() - 1,
                                            birthMonth.getMonth(),
                                            1,
                                          ),
                                        )
                                      }
                                      className="flex size-8 items-center justify-center rounded-md border border-(--brc-border) bg-white text-(--brc-text) transition hover:border-(--brc-primary) hover:bg-[var(--brc-primary-tint)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <ChevronLeftIcon className="size-4" />
                                    </button>
                                    <input
                                      aria-label="Birth year"
                                      inputMode="numeric"
                                      min={MIN_BIRTH_YEAR}
                                      max={maxBirthYear}
                                      value={birthYearInput}
                                      onBlur={commitBirthYearInput}
                                      onChange={(event) =>
                                        handleBirthYearInput(
                                          event.target.value,
                                        )
                                      }
                                      className="h-8 w-20 rounded-md border border-(--brc-border) bg-(--brc-bg-subtle) px-2 text-center text-sm font-medium text-(--brc-text) outline-none transition focus:border-(--brc-primary) focus:ring-2 focus:ring-[rgba(0,0,152,0.14)]"
                                    />
                                    <button
                                      type="button"
                                      aria-label="Next year"
                                      disabled={
                                        birthMonth.getFullYear() >= maxBirthYear
                                      }
                                      onClick={() =>
                                        updateBirthMonth(
                                          new Date(
                                            birthMonth.getFullYear() + 1,
                                            birthMonth.getMonth(),
                                            1,
                                          ),
                                        )
                                      }
                                      className="flex size-8 items-center justify-center rounded-md border border-(--brc-border) bg-white text-(--brc-text) transition hover:border-(--brc-primary) hover:bg-[var(--brc-primary-tint)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <ChevronRightIcon className="size-4" />
                                    </button>
                                  </div>
                                </div>
                                <Calendar
                                  className="p-3 [&_.rdp-month]:space-y-4 [&_.rdp-caption_label]:font-medium [&_.rdp-nav]:space-x-1 [&_.rdp-day_button]:h-9 [&_.rdp-day_button]:w-9 [&_.rdp-day_button]:rounded-lg [&_.rdp-day_button]:text-sm [&_.rdp-day_button:hover]:bg-[var(--brc-primary-tint)] [&_.rdp-day_selected_.rdp-day_button]:bg-[var(--brc-primary)] [&_.rdp-day_selected_.rdp-day_button]:text-white [&_.rdp-day_today_.rdp-day_button]:border [&_.rdp-day_today_.rdp-day_button]:border-[var(--brc-primary)]"
                                  mode="single"
                                  selected={
                                    field.value
                                      ? new Date(field.value)
                                      : undefined
                                  }
                                  onSelect={(date) => {
                                    field.onChange(
                                      date ? format(date, "yyyy-MM-dd") : "",
                                    );
                                    if (date) updateBirthMonth(date);
                                  }}
                                  disabled={(date) =>
                                    date > today ||
                                    date < new Date("1920-01-01")
                                  }
                                  month={birthMonth}
                                  onMonthChange={updateBirthMonth}
                                  captionLayout="label"
                                  startMonth={new Date(1920, 0)}
                                  endMonth={today}
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
                            onChange={(value) =>
                              handleCountryChange(value, field.onChange)
                            }
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
                            state={stateName ?? ""}
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
