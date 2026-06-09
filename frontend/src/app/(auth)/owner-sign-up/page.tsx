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
  Radio,
  Checkbox,
  UploadField,
  AuthShell,
  PhoneField,
  CountrySelect,
  StateSelect,
  CityCombobox,
} from "@/features/auth/components";
import { COUNTRIES } from "@/features/auth/data/countries";
import { useSignUp } from "@/features/auth/api";
import { ownerSignUpSchema, type OwnerSignUpInput } from "@/features/auth/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export default function OwnerSignUpPage() {
  const [step, setStep] = useState(1);
  const [agree, setAgree] = useState(false);
  const [document, setDocument] = useState<File | null>(null);
  const [phoneCode, setPhoneCode] = useState("+234");
  const router = useRouter();
  const signUp = useSignUp();

  const form = useForm<OwnerSignUpInput>({
    resolver: zodResolver(ownerSignUpSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      owner_type: undefined,
      fleet_name: "",
      national_id: "",
      location: "",
      rc_number: "",
      bank_account: "",
      bank_name: "",
      country: "",
      state: "",
      city: "",
    },
  });

  const ownerType = useWatch({ control: form.control, name: "owner_type" });
  const countryIso = useWatch({ control: form.control, name: "country" });
  const stateName = useWatch({ control: form.control, name: "state" });
  const countryName = COUNTRIES.find((c) => c.iso === countryIso)?.name ?? "";
  const isCompany = ownerType === "fleet";

  const handleCountryChange = (value: string, onChange: (v: string) => void) => {
    onChange(value);
    const dial = COUNTRIES.find((c) => c.iso === value)?.dial;
    if (dial) setPhoneCode(dial);
    form.setValue("state", "");
    form.setValue("city", "");
  };

  const handleContinue = async () => {
    const valid = await form.trigger(["first_name", "last_name", "email", "phone", "password", "confirmPassword", "owner_type"]);
    if (!valid) {
      const firstError = Object.values(form.formState.errors)[0];
      if (firstError?.message) toast.error(firstError.message);
      return;
    }
    setStep(2);
  };

  const handleSubmit = (values: OwnerSignUpInput) => {
    if (!agree) {
      toast.error("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    signUp.mutate(
      {
        role: "owner",
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        password: values.password,
        phone: values.phone,
        owner_type: values.owner_type,
        fleet_name: values.fleet_name,
        national_id: values.national_id,
        location: values.location,
        rc_number: values.rc_number,
        bank_account: values.bank_account,
        bank_name: values.bank_name,
        document: document ?? undefined,
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
                  Owner Sign Up
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
                    <FormField control={form.control} name="first_name" render={({ field }) => (
                      <FormItem>
                        <AuthField label="First Name" placeholder="First Name" value={field.value} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="last_name" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Last Name" placeholder="Last Name" value={field.value} onChange={field.onChange} />
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
                        <PhoneField
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          code={phoneCode}
                          onCodeChange={setPhoneCode}
                        />
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
                    <FormField control={form.control} name="owner_type" render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col gap-2">
                          <span className="text-base text-(--brc-text) [font-family:var(--brc-font-ui)]">Type of Ownership</span>
                          <div className="flex flex-wrap gap-6 py-2">
                            <Radio checked={field.value === "individual"} label="Private Car" name="owner_type" value="individual" onChange={() => field.onChange("individual")} />
                            <Radio checked={field.value === "fleet"} label="Company" name="owner_type" value="fleet" onChange={() => field.onChange("fleet")} />
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {isCompany ? (
                      <>
                        <FormField control={form.control} name="fleet_name" render={({ field }) => (
                          <FormItem>
                            <AuthField label="Company Name" placeholder="Enter company name" value={field.value ?? ""} onChange={field.onChange} />
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="rc_number" render={({ field }) => (
                          <FormItem>
                            <AuthField label="Company Registration Number (RC Number)" placeholder="Enter your RC Number" value={field.value ?? ""} onChange={field.onChange} />
                            <FormMessage />
                          </FormItem>
                        )} />
                        <UploadField
                          label="Upload CAC Document"
                          hint="PDF, DOC, DOCX, JPG, PNG, or WEBP (Max 9MB)"
                          value={document?.name}
                          onPick={setDocument}
                        />
                      </>
                    ) : (
                      <>
                        <FormField control={form.control} name="country" render={({ field }) => (
                          <FormItem>
                            <CountrySelect
                              value={field.value ?? ""}
                              onChange={(v) => handleCountryChange(v, field.onChange)}
                            />
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="state" render={({ field }) => (
                          <FormItem>
                            <StateSelect country={countryName} value={field.value ?? ""} onChange={field.onChange} label="State" />
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="city" render={({ field }) => (
                          <FormItem>
                            <CityCombobox
                              country={countryName}
                              state={stateName ?? ""}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              label="City"
                            />
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="location" render={({ field }) => (
                          <FormItem>
                            <AuthField label="Address" placeholder="Enter your address" value={field.value ?? ""} onChange={field.onChange} />
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="national_id" render={({ field }) => (
                          <FormItem>
                            <AuthField
                              label="National ID"
                              placeholder="Enter your ID number"
                              value={field.value ?? ""}
                              onChange={(value) => field.onChange(onlyDigits(value))}
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                            />
                            <FormMessage />
                          </FormItem>
                        )} />
                        <UploadField
                          label="Upload Car Ownership Document"
                          hint="PDF, DOC, DOCX, JPG, PNG, or WEBP (Max 9MB)"
                          value={document?.name}
                          onPick={setDocument}
                        />
                      </>
                    )}
                    <FormField control={form.control} name="bank_account" render={({ field }) => (
                      <FormItem>
                        <AuthField
                          label="Bank Account Number"
                          placeholder="Enter bank account number"
                          value={field.value}
                          onChange={(value) => field.onChange(onlyDigits(value))}
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bank_name" render={({ field }) => (
                      <FormItem>
                        <AuthField label="Bank Name" placeholder="Enter bank name" value={field.value} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Checkbox checked={agree} onChange={() => setAgree(!agree)}>
                      I agree to the{" "}
                      <span className="text-(--brc-accent) underline">Terms of Service</span>{" "}
                      and{" "}
                      <span className="text-(--brc-accent) underline">Privacy Policy</span>
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
