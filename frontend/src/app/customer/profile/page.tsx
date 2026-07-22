"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PencilIcon, XIcon, Loader2Icon } from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import {
  AuthField,
  AuthButton,
  CountrySelect,
  StateSelect,
  CityCombobox,
} from "@/features/auth/components";
import { useMe, useUpdateProfile, useChangePassword } from "@/features/auth/api";
import {
  profileUpdateSchema,
  changePasswordSchema,
} from "@/features/auth/schemas";
import { COUNTRIES } from "@/features/auth/data/countries";
import { ApiError } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type ProfileInput = z.infer<typeof profileUpdateSchema>;
type PasswordInput = z.infer<typeof changePasswordSchema>;

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function isoToName(iso: string): string {
  return COUNTRIES.find((c) => c.iso === iso.toLowerCase())?.name ?? "";
}

type Field = { label: string; value: string; icon: IconName };

function ReadonlyField({ field }: { field: Field }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
        <Icon name={field.icon} size={16} stroke="var(--brc-text-secondary)" />
        {field.label}
      </span>
      <div className="flex h-[52px] items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-(--brc-radius-sm) border border-(--brc-border) bg-(--brc-bg-subtle) px-4 text-sm text-(--brc-text) [font-family:var(--brc-font-ui)]">
        {field.value}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const profile = user?.customer_profile;

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? "",
      drivers_license: profile?.drivers_license ?? "",
      date_of_birth: profile?.date_of_birth ?? "",
      address: profile?.address ?? "",
      state: profile?.state ?? "",
      city: profile?.city ?? "",
      country: profile?.country ?? "",
    },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  // Watch country for state/city cascading
  const watchedCountry = useWatch({ control: form.control, name: "country" });
  const watchedState = useWatch({ control: form.control, name: "state" });
  const countryName = isoToName(watchedCountry ?? "");

  function startEditing() {
    form.reset({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? "",
      drivers_license: profile?.drivers_license ?? "",
      date_of_birth: profile?.date_of_birth ?? "",
      address: profile?.address ?? "",
      state: profile?.state ?? "",
      city: profile?.city ?? "",
      country: profile?.country ?? "",
    });
    setEditing(true);
  }

  function cancelEditing() {
    form.reset();
    setEditing(false);
  }

  function handleSave(values: ProfileInput) {
    updateProfile.mutate(values, {
      onSuccess: () => {
        toast.success("Profile updated successfully");
        setEditing(false);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Failed to update profile",
        );
      },
    });
  }

  function handlePasswordChange(values: PasswordInput) {
    changePassword.mutate(
      { old_password: values.old_password, new_password: values.new_password },
      {
        onSuccess: () => {
          toast.success("Password changed successfully");
          passwordForm.reset();
          setShowPassword(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError
              ? error.message
              : "Failed to change password",
          );
        },
      },
    );
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center p-10 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        <Loader2Icon className="mr-2 animate-spin" size={20} />
        Loading...
      </div>
    );
  }

  const fields: Field[] = [
    { label: "First Name", value: user.first_name, icon: "user" },
    { label: "Last Name", value: user.last_name, icon: "user" },
    { label: "Email Address", value: user.email, icon: "mail" },
    { label: "Phone No", value: user.phone || "—", icon: "phone" },
    {
      label: "Date of Birth",
      value: profile?.date_of_birth || "—",
      icon: "calendar",
    },
    {
      label: "Driver's License",
      value: profile?.drivers_license || "—",
      icon: "idcard",
    },
    { label: "Address", value: profile?.address || "—", icon: "pin" },
    { label: "State", value: profile?.state || "—", icon: "pin" },
    { label: "City", value: profile?.city || "—", icon: "pin" },
    { label: "Country", value: profile?.country || "—", icon: "pin" },
  ];

  return (
    <div className="bg-(--brc-bg-subtle)">
      <div className="mx-auto flex w-full max-w-[1232px] flex-col gap-7 px-[clamp(20px,8vw,104px)] py-[clamp(24px,5vw,40px)] pb-16">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[clamp(28px,6vw,44px)] font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
            My Profile
          </h1>
          <p className="m-0 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Manage your account information
          </p>
        </div>

        {/* Account card */}
        <Card className="rounded-(--brc-radius-lg) border border-(--brc-border) p-[clamp(20px,3vw,32px)] shadow-none">
          <CardContent className="flex flex-col gap-7 p-0">
            {/* Identity row */}
            <div className="flex items-start gap-4 sm:items-center sm:gap-[18px]">
              <Avatar className="size-16 after:hidden sm:size-[88px]">
                <AvatarFallback className="rounded-full bg-(--brc-primary-tint) text-2xl font-extrabold text-(--brc-primary) [font-family:var(--brc-font-display)] sm:text-[30px]">
                  {initials(`${user.first_name} ${user.last_name}`)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-[22px]">
                  {user.first_name} {user.last_name}
                </span>
                <span className="truncate text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  {user.email}
                </span>
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-(--brc-accent-bg) px-3 py-1 text-xs font-semibold text-(--brc-accent) [font-family:var(--brc-font-ui)]">
                  <span className="size-[7px] rounded-full bg-(--brc-accent)" />
                  Customer Account
                </span>
              </div>
              {/* Edit button — pinned top-right; icon-only on mobile */}
              <div className="shrink-0">
                {!editing ? (
                  <button
                    type="button"
                    onClick={startEditing}
                    aria-label="Edit Profile"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-3 py-2.5 text-sm font-semibold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)] sm:px-4"
                  >
                    <PencilIcon size={16} />
                    <span className="hidden sm:inline">Edit Profile</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={cancelEditing}
                    aria-label="Cancel"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-3 py-2.5 text-sm font-semibold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)] sm:px-4"
                  >
                    <XIcon size={16} />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                )}
              </div>
            </div>

            <div className="h-px bg-(--brc-border)" />

            {/* Fields — read-only or editable */}
            {!editing ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5 gap-x-6">
                {fields.map((f) => (
                  <ReadonlyField key={f.label} field={f} />
                ))}
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSave)}
                  className="flex flex-col gap-6"
                >
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5 gap-x-6">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="First Name"
                            placeholder="First name"
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
                            placeholder="Last name"
                            value={field.value}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Email — read-only */}
                    <ReadonlyField
                      field={{
                        label: "Email Address",
                        value: user.email,
                        icon: "mail",
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Phone No"
                            placeholder="Phone number"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            inputMode="numeric"
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
                          <AuthField
                            label="Date of Birth"
                            placeholder="YYYY-MM-DD"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="drivers_license"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Driver's License"
                            placeholder="License number"
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
                            placeholder="Street address"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
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
                            label="Country"
                            value={field.value ?? ""}
                            onChange={(iso) => {
                              field.onChange(iso);
                              form.setValue("state", "");
                              form.setValue("city", "");
                            }}
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
                            onChange={(val) => {
                              field.onChange(val);
                              form.setValue("city", "");
                            }}
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
                            state={watchedState ?? ""}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3">
                    <AuthButton
                      type="submit"
                      loading={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </AuthButton>
                    <AuthButton variant="neutral" onClick={cancelEditing}>
                      Cancel
                    </AuthButton>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="rounded-(--brc-radius-lg) border border-(--brc-border) p-[clamp(20px,3vw,32px)] shadow-none">
          <CardContent className="flex flex-col gap-5 p-0">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                Change Password
              </h2>
              {!showPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(true)}
                  className="cursor-pointer rounded-lg border border-(--brc-border) bg-white px-4 py-2.5 text-sm font-semibold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
                >
                  Change
                </button>
              )}
            </div>

            {showPassword && (
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
                  className="flex flex-col gap-5"
                >
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5 gap-x-6">
                    <FormField
                      control={passwordForm.control}
                      name="old_password"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Current Password"
                            placeholder="Enter current password"
                            type="password"
                            value={field.value}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="new_password"
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
                      control={passwordForm.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Confirm New Password"
                            placeholder="Confirm new password"
                            type="password"
                            value={field.value}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-3">
                    <AuthButton
                      type="submit"
                      loading={changePassword.isPending}
                    >
                      {changePassword.isPending
                        ? "Changing..."
                        : "Update Password"}
                    </AuthButton>
                    <AuthButton
                      variant="neutral"
                      onClick={() => {
                        setShowPassword(false);
                        passwordForm.reset();
                      }}
                    >
                      Cancel
                    </AuthButton>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Loyalty information */}
        <Card className="rounded-(--brc-radius-lg) border border-(--brc-border) p-[clamp(20px,3vw,32px)] shadow-none">
          <CardContent className="flex flex-col gap-[18px] p-0">
            <h2 className="m-0 text-xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              Loyalty Information
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-(--brc-radius-md) bg-linear-to-br from-(--brc-accent-bg) to-[#fbe7d6] p-5 px-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  Current Point
                </span>
                <span className="text-[32px] font-extrabold text-(--brc-accent-deep) [font-family:var(--brc-font-display)]">
                  0
                </span>
              </div>
              <AuthButton href="/customer/loyalty">View Rewards</AuthButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
