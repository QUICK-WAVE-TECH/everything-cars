"use client";

import { useState } from "react";
import { Building2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CityCombobox,
  CountrySelect,
  PhoneField,
  StateSelect,
} from "@/features/auth/components";
import { COUNTRIES } from "@/features/auth/data/countries";
import { useMe } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

import { useCreateBranch, useUpdateBranch } from "../api/branches-api";
import type { Branch, BranchInput } from "../api/types";

// `country` holds a lowercase ISO code (matches the COUNTRIES data + CountrySelect);
// `phone` is just the local number — the dial code is tracked separately and
// combined on submit.
type FormValues = BranchInput;
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  name: "",
  country: "",
  state: "",
  city: "",
  street_address: "",
  phone: "",
  email: "",
};

/** Split a stored international phone ("+2348012345678") into a dial code and
 * the local number, using the branch's country to find the dial prefix. */
function splitPhone(phone: string, iso: string): { code: string; number: string } {
  const dial = COUNTRIES.find((c) => c.iso === iso)?.dial ?? "+234";
  const number = phone.startsWith(dial) ? phone.slice(dial.length) : phone;
  return { code: dial, number: number.replace(/\D/g, "") };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: FormValues): FormErrors {
  const e: FormErrors = {};
  if (!v.name.trim()) e.name = "Branch name is required.";
  if (!v.country.trim()) e.country = "Country is required.";
  if (!v.state.trim()) e.state = "State is required.";
  if (!v.city.trim()) e.city = "City is required.";
  if (!v.street_address.trim()) e.street_address = "Street address is required.";
  if (!v.phone.trim()) e.phone = "Phone number is required.";
  if (!v.email.trim()) e.email = "Email is required.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  return e;
}

/** Map a DRF 400 body ({field: [msg]}) onto form errors. */
function serverErrors(error: unknown): FormErrors {
  if (error instanceof ApiError && error.data && typeof error.data === "object") {
    const data = error.data as Record<string, unknown>;
    const out: FormErrors = {};
    for (const key of Object.keys(EMPTY) as (keyof FormValues)[]) {
      const val = data[key];
      if (Array.isArray(val) && val.length) out[key] = String(val[0]);
      else if (typeof val === "string") out[key] = val;
    }
    return out;
  }
  return {};
}

/** Add or edit a branch. `branch === null` → create; otherwise edit. The
 * business name is shown read-only (inherited, never editable per-branch). */
export function BranchFormDialog({
  open,
  onOpenChange,
  businessName,
  branch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  branch: Branch | null;
}) {
  const isEdit = branch !== null;
  const create = useCreateBranch();
  const update = useUpdateBranch();
  const saving = create.isPending || update.isPending;

  // A new branch defaults to the owner's registered country, but it can be
  // changed so a branch can live in another country. State/City are driven by
  // whichever country is selected here.
  const { data: me } = useMe();
  const defaultIso = (me?.owner_profile?.country ?? "").toLowerCase();

  // Lazy init from `branch`; the parent remounts this dialog on each open (via a
  // changing key), so state resets without a setState-in-effect.
  const [values, setValues] = useState<FormValues>(() =>
    branch
      ? {
          name: branch.name,
          country: branch.country.toLowerCase(),
          state: branch.state,
          city: branch.city,
          street_address: branch.street_address,
          phone: splitPhone(branch.phone, branch.country.toLowerCase()).number,
          email: branch.email,
        }
      : { ...EMPTY, country: defaultIso },
  );
  const [phoneCode, setPhoneCode] = useState(() =>
    branch
      ? splitPhone(branch.phone, branch.country.toLowerCase()).code
      : COUNTRIES.find((c) => c.iso === defaultIso)?.dial ?? "+234",
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const countryName =
    COUNTRIES.find((c) => c.iso === values.country)?.name ?? "";

  const set = (key: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // Changing the country resets the dependent state/city and moves the dial
  // code to the new country's default.
  const handleCountryChange = (iso: string) => {
    setValues((prev) => ({ ...prev, country: iso, state: "", city: "" }));
    setErrors((prev) => ({ ...prev, country: undefined }));
    setPhoneCode(COUNTRIES.find((c) => c.iso === iso)?.dial ?? phoneCode);
  };

  function handleSubmit() {
    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const trimmed: FormValues = {
      name: values.name.trim(),
      country: values.country.toUpperCase(),
      state: values.state.trim(),
      city: values.city.trim(),
      street_address: values.street_address.trim(),
      // Store the full international number (dial code + local number).
      phone: `${phoneCode}${values.phone.replace(/\D/g, "")}`,
      email: values.email.trim(),
    };

    const onError = (error: unknown) => {
      const fieldErrors = serverErrors(error);
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
      } else {
        toast.error(
          error instanceof ApiError && error.message
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
    };

    if (isEdit && branch) {
      update.mutate(
        { id: branch.id, input: trimmed },
        {
          onSuccess: () => {
            toast.success("Branch updated");
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      create.mutate(trimmed, {
        onSuccess: () => {
          toast.success("Branch created");
          onOpenChange(false);
        },
        onError,
      });
    }
  }

  const inputClass = (key: keyof FormValues) =>
    `h-12 w-full rounded-lg border bg-(--brc-bg-subtle) px-3.5 text-sm text-(--brc-text) outline-none transition focus:bg-(--brc-bg) focus:shadow-[0_0_0_3px_rgba(0,0,139,0.12)] ${
      errors[key] ? "border-(--brc-danger)" : "border-(--brc-border) focus:border-(--brc-primary)"
    }`;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-[560px] rounded-2xl [font-family:var(--brc-font-ui)]">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-bold tracking-tight">
            {isEdit ? "Edit branch" : "Add branch"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this location's address and contact details."
              : "Give this location its own address and contact details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Business name — read-only, inherited */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[13.5px] font-semibold text-(--brc-text)">
              Business name
            </label>
            <div className="flex h-12 cursor-not-allowed items-center gap-2.5 rounded-lg border border-(--brc-border) bg-(--brc-bg-muted) px-3.5">
              <Building2 size={16} className="shrink-0 text-(--brc-text-muted)" />
              <input
                type="text"
                value={businessName}
                readOnly
                tabIndex={-1}
                className="min-w-0 flex-1 cursor-not-allowed border-0 bg-transparent text-sm font-semibold text-(--brc-text-muted) outline-none"
              />
              <Lock size={15} className="shrink-0 text-(--brc-text-muted)" />
            </div>
            <span className="text-xs leading-snug text-(--brc-text-muted)">
              Inherited from your business — can&apos;t be changed here.
            </span>
          </div>

          {/* Branch name */}
          <Field label="Branch name" error={errors.name} className="sm:col-span-2">
            <input
              type="text"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g., Lagos — Amuwo Odofin Branch"
              className={inputClass("name")}
            />
          </Field>

          {/* Country — defaults to the owner's, but a branch can be elsewhere.
              Changing it repopulates State/City and the phone dial code. */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <CountrySelect value={values.country} onChange={handleCountryChange} />
            {errors.country ? <ErrorText>{errors.country}</ErrorText> : null}
          </div>

          {/* State + City — same geo API as registration, driven by the
              selected country. Changing the state clears the city. */}
          <div className="flex flex-col gap-1.5">
            <StateSelect
              country={countryName}
              value={values.state}
              onChange={(s) => {
                set("state", s);
                set("city", "");
              }}
            />
            {errors.state ? <ErrorText>{errors.state}</ErrorText> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <CityCombobox
              country={countryName}
              state={values.state}
              value={values.city}
              onChange={(c) => set("city", c)}
            />
            {errors.city ? <ErrorText>{errors.city}</ErrorText> : null}
          </div>

          {/* Street address */}
          <Field
            label="Street address"
            error={errors.street_address}
            className="sm:col-span-2"
          >
            <input
              type="text"
              value={values.street_address}
              onChange={(e) => set("street_address", e.target.value)}
              placeholder="e.g., 14 Alhaji Kanike Street, Amuwo Odofin"
              className={inputClass("street_address")}
            />
          </Field>

          {/* Phone + Email */}
          <div className="flex flex-col gap-1.5">
            <PhoneField
              label="Branch phone"
              placeholder="Enter branch phone number"
              value={values.phone}
              onChange={(v) => set("phone", v)}
              code={phoneCode}
              onCodeChange={setPhoneCode}
            />
            {errors.phone ? <ErrorText>{errors.phone}</ErrorText> : null}
          </div>
          <Field label="Branch email" error={errors.email}>
            <input
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="lagos@yourbusiness.ng"
              className={inputClass("email")}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-12 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-5 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-(--brc-primary) px-5.5 text-sm font-bold text-(--brc-text-on-primary) transition-colors hover:bg-(--brc-primary-hover) disabled:cursor-wait disabled:opacity-70"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save branch"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-[13.5px] font-semibold text-(--brc-text)">{label}</label>
      {children}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold leading-snug text-(--brc-danger)">
      {children}
    </span>
  );
}
