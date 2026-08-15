"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LockIcon, PencilIcon, XIcon, Loader2Icon, FileTextIcon } from "lucide-react";
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
  ownerProfileUpdateSchema,
  changePasswordSchema,
  idTypeLabel,
  PASSWORD_HINT,
} from "@/features/auth/schemas";
import { COUNTRIES } from "@/features/auth/data/countries";
import { ApiError } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";

type ProfileInput = z.infer<typeof ownerProfileUpdateSchema>;
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

type Field = { label: string; value: string; icon: IconName; locked?: boolean };

function IdDocumentField({ idType, hasDocument }: { idType?: string; hasDocument: boolean }) {
  const label = idTypeLabel(idType);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center justify-between gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
        <span className="flex min-w-0 items-center gap-2">
          <Icon name="idcard" size={16} stroke="var(--brc-text-secondary)" />
          <span className="truncate">ID Document</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--brc-bg-subtle) px-2 py-0.5 text-[11px] font-semibold text-(--brc-text-muted)">
          <LockIcon size={12} />
          Locked
        </span>
      </span>
      <Attachment state={hasDocument ? "done" : "idle"} className="w-full max-w-full">
        <AttachmentMedia variant="icon">
          <FileTextIcon aria-hidden="true" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{hasDocument ? label || "ID document" : "ID document"}</AttachmentTitle>
          <AttachmentDescription>
            {hasDocument ? "On file" : "Not uploaded"}
          </AttachmentDescription>
        </AttachmentContent>
      </Attachment>
    </div>
  );
}

function ReadonlyField({ field }: { field: Field }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center justify-between gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
        <span className="flex min-w-0 items-center gap-2">
          <Icon name={field.icon} size={16} stroke="var(--brc-text-secondary)" />
          <span className="truncate">{field.label}</span>
        </span>
        {field.locked && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--brc-bg-subtle) px-2 py-0.5 text-[11px] font-semibold text-(--brc-text-muted)">
            <LockIcon size={12} />
            Locked
          </span>
        )}
      </span>
      <div className="flex h-[52px] items-center justify-between gap-3 overflow-hidden rounded-(--brc-radius-sm) border border-(--brc-border) bg-(--brc-bg-subtle) px-4 text-sm text-(--brc-text) [font-family:var(--brc-font-ui)]">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {field.value}
        </span>
        {field.locked && (
          <LockIcon size={16} className="shrink-0 text-(--brc-text-muted)" />
        )}
      </div>
    </div>
  );
}

export default function OwnerProfilePage() {
  const { data: user, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const profile = user?.owner_profile;

  const form = useForm<ProfileInput>({
    resolver: zodResolver(ownerProfileUpdateSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? "",
      fleet_name: profile?.fleet_name ?? "",
      location: profile?.location ?? "",
      rc_number: profile?.rc_number ?? "",
      country: profile?.country ?? "",
      state: profile?.state ?? "",
      city: profile?.city ?? "",
      address: profile?.address ?? "",
      bank_account: profile?.bank_account ?? "",
      bank_name: profile?.bank_name ?? "",
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

  const watchedCountry = useWatch({ control: form.control, name: "country" });
  const watchedState = useWatch({ control: form.control, name: "state" });
  const countryName = isoToName(watchedCountry ?? "");

  function startEditing() {
    form.reset({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? "",
      fleet_name: profile?.fleet_name ?? "",
      location: profile?.location ?? "",
      rc_number: profile?.rc_number ?? "",
      country: profile?.country ?? "",
      state: profile?.state ?? "",
      city: profile?.city ?? "",
      address: profile?.address ?? "",
      bank_account: profile?.bank_account ?? "",
      bank_name: profile?.bank_name ?? "",
    });
    setEditing(true);
  }

  function cancelEditing() {
    form.reset();
    setEditing(false);
  }

  function handleSave(values: ProfileInput) {
    const payload: Record<string, unknown> = { ...values };
    updateProfile.mutate(payload, {
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
      label: "Owner Type",
      value: profile?.owner_type === "fleet" ? "Fleet" : "Individual",
      icon: "car",
    },
    { label: "Fleet Name", value: profile?.fleet_name || "—", icon: "car" },
    {
      label: "ID Type",
      value: idTypeLabel(profile?.id_type) || "—",
      icon: "idcard",
      locked: true,
    },
    {
      label: idTypeLabel(profile?.id_type) ? `${idTypeLabel(profile?.id_type)} Number` : "ID Number",
      value: profile?.national_id || "—",
      icon: "idcard",
      locked: true,
    },
    { label: "Location", value: profile?.location || "—", icon: "pin" },
    { label: "RC Number", value: profile?.rc_number || "—", icon: "idcard" },
    { label: "Address", value: profile?.address || "—", icon: "pin" },
    { label: "Country", value: profile?.country || "—", icon: "pin" },
    { label: "State", value: profile?.state || "—", icon: "pin" },
    { label: "City", value: profile?.city || "—", icon: "pin" },
    { label: "Bank Name", value: profile?.bank_name || "—", icon: "banknote" },
    {
      label: "Bank Account",
      value: profile?.bank_account || "—",
      icon: "banknote",
    },
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
            {/* Identity header */}
            <div className="flex flex-col gap-4">
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
                  {/* Badges — under the name on desktop */}
                  <div className="hidden flex-wrap items-center gap-2 sm:flex">
                    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-(--brc-accent-bg) px-3 py-1 text-xs font-semibold text-(--brc-accent) [font-family:var(--brc-font-ui)]">
                      <span className="size-[7px] rounded-full bg-(--brc-accent)" />
                      Owner Account
                    </span>
                    {profile?.is_verified && (
                      <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-(--brc-success-bg) px-3 py-1 text-xs font-semibold text-(--brc-success) [font-family:var(--brc-font-ui)]">
                        Verified
                      </span>
                    )}
                  </div>
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
              {/* Badges — full-width row on mobile so both fit on one line */}
              <div className="flex flex-wrap items-center gap-2 sm:hidden">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-accent-bg) px-3 py-1 text-xs font-semibold text-(--brc-accent) [font-family:var(--brc-font-ui)]">
                  <span className="size-[7px] rounded-full bg-(--brc-accent)" />
                  Owner Account
                </span>
                {profile?.is_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-success-bg) px-3 py-1 text-xs font-semibold text-(--brc-success) [font-family:var(--brc-font-ui)]">
                    Verified
                  </span>
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
                <IdDocumentField
                  idType={profile?.id_type}
                  hasDocument={!!profile?.id_document}
                />
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
                    {/* Owner type — read-only */}
                    <ReadonlyField
                      field={{
                        label: "Owner Type",
                        value:
                          profile?.owner_type === "fleet"
                            ? "Fleet"
                            : "Individual",
                        icon: "car",
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="fleet_name"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Fleet Name"
                            placeholder="Fleet/company name"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col gap-4 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 sm:col-span-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        <LockIcon size={15} className="text-(--brc-text-muted)" />
                        Identity Verification
                      </span>
                      <p className="m-0 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Means of identity is locked for now. Contact support if these details need to change.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <ReadonlyField
                          field={{
                            label: "ID Type",
                            value: idTypeLabel(profile?.id_type) || "—",
                            icon: "idcard",
                            locked: true,
                          }}
                        />
                        <ReadonlyField
                          field={{
                            label: idTypeLabel(profile?.id_type)
                              ? `${idTypeLabel(profile?.id_type)} Number`
                              : "ID Number",
                            value: profile?.national_id || "—",
                            icon: "idcard",
                            locked: true,
                          }}
                        />
                        <IdDocumentField
                          idType={profile?.id_type}
                          hasDocument={!!profile?.id_document}
                        />
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Location"
                            placeholder="Your location"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rc_number"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="RC Number"
                            placeholder="Company registration number"
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
                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Bank Name"
                            placeholder="Bank name"
                            value={field.value}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bank_account"
                      render={({ field }) => (
                        <FormItem>
                          <AuthField
                            label="Bank Account"
                            placeholder="Account number"
                            value={field.value}
                            onChange={field.onChange}
                            inputMode="numeric"
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
                            hint={PASSWORD_HINT}
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
      </div>
    </div>
  );
}
