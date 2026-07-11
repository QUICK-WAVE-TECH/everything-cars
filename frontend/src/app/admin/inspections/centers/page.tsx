"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  PlusIcon,
  XIcon,
  Loader2Icon,
  PencilIcon,
  PowerIcon,
  ArrowLeftIcon,
  BuildingIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
import {
  useAdminCenters,
  useCreateCenter,
  useUpdateCenter,
} from "@/features/inspections/api/inspections-api";
import type { InspectionCenter } from "@/features/inspections/api/types";
import { CountrySelect } from "@/features/auth/components/country-select";
import { StateSelect } from "@/features/auth/components/state-select";
import { CityCombobox } from "@/features/auth/components/city-combobox";
import { COUNTRIES } from "@/features/auth/data/countries";

// ── Shared inline styles (matches admin/inspections/page.tsx language) ──

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--brc-text-muted)",
  fontFamily: "var(--brc-font-ui)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

function countryNameFromIso(iso: string): string {
  return COUNTRIES.find((c) => c.iso.toLowerCase() === iso.toLowerCase())?.name ?? "";
}

function isoFromCountryValue(country: string): string {
  // `country` on the model is the ISO2 code (e.g. "NG"); guard against a full name being stored.
  const byIso = COUNTRIES.find((c) => c.iso.toLowerCase() === country.toLowerCase());
  if (byIso) return byIso.iso;
  const byName = COUNTRIES.find((c) => c.name.toLowerCase() === country.toLowerCase());
  return byName?.iso ?? "ng";
}

// ── Form state ──

type CenterFormState = {
  company_name: string;
  address: string;
  countryIso: string; // lowercase iso, drives CountrySelect + geo lookups
  state: string;
  city: string;
  country_code: string;
  city_code: string;
  phone: string;
  email: string;
  max_reschedules: string;
};

const EMPTY_FORM: CenterFormState = {
  company_name: "",
  address: "",
  countryIso: "ng",
  state: "",
  city: "",
  country_code: "NG",
  city_code: "",
  phone: "",
  email: "",
  max_reschedules: "2",
};

function centerToForm(center: InspectionCenter): CenterFormState {
  return {
    company_name: center.company_name,
    address: center.address,
    countryIso: isoFromCountryValue(center.country),
    state: center.state,
    city: center.city,
    country_code: center.country_code,
    city_code: center.city_code,
    phone: center.phone,
    email: center.email,
    max_reschedules: String(center.max_reschedules),
  };
}

function validateForm(form: CenterFormState): string | null {
  if (!form.company_name.trim()) return "Company name is required.";
  if (!form.address.trim()) return "Address is required.";
  if (!form.state.trim()) return "State is required.";
  if (!form.city.trim()) return "City is required.";
  const countryCode = form.country_code.trim().toUpperCase();
  if (countryCode.length < 2 || countryCode.length > 3 || !/^[A-Z]+$/.test(countryCode)) {
    return "Country code must be 2–3 letters.";
  }
  const cityCode = form.city_code.trim().toUpperCase();
  if (cityCode.length !== 3 || !/^[A-Z]+$/.test(cityCode)) {
    return "City code must be exactly 3 letters.";
  }
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    return "Enter a valid email address.";
  }
  const maxReschedules = Number(form.max_reschedules);
  if (!Number.isFinite(maxReschedules) || maxReschedules < 0) {
    return "Max reschedules must be a non-negative number.";
  }
  return null;
}

// ── Center Form Dialog (create + edit) ──

function CenterFormDialog({
  open,
  onClose,
  center,
}: {
  open: boolean;
  onClose: () => void;
  center: InspectionCenter | null;
}) {
  const isEdit = !!center;
  const [form, setForm] = useState<CenterFormState>(EMPTY_FORM);

  const createCenter = useCreateCenter();
  const updateCenter = useUpdateCenter();
  const isPending = createCenter.isPending || updateCenter.isPending;

  // Re-seed the form when the dialog opens or the target center changes
  // (state-adjustment-during-render pattern — avoids an effect re-render)
  const formKey = open ? (center?.id ?? "new") : "closed";
  const [prevFormKey, setPrevFormKey] = useState(formKey);
  if (prevFormKey !== formKey) {
    setPrevFormKey(formKey);
    if (open) {
      setForm(center ? centerToForm(center) : EMPTY_FORM);
    }
  }

  const countryName = useMemo(() => countryNameFromIso(form.countryIso), [form.countryIso]);
  const validationError = useMemo(() => validateForm(form), [form]);

  function update<K extends keyof CenterFormState>(key: K, value: CenterFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCountryChange(iso: string) {
    setForm((prev) => ({ ...prev, countryIso: iso, state: "", city: "" }));
  }

  function handleStateChange(state: string) {
    setForm((prev) => ({ ...prev, state, city: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }

    const payload: Partial<InspectionCenter> = {
      company_name: form.company_name.trim(),
      address: form.address.trim(),
      country: form.countryIso.toUpperCase(),
      country_code: form.country_code.trim().toUpperCase(),
      state: form.state.trim(),
      city: form.city.trim(),
      city_code: form.city_code.trim().toUpperCase(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      max_reschedules: Number(form.max_reschedules),
    };

    try {
      if (isEdit && center) {
        await updateCenter.mutateAsync({ centerId: center.id, ...payload });
        toast.success("Inspection center updated.");
      } else {
        await createCenter.mutateAsync(payload);
        toast.success("Inspection center created.");
      }
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to save inspection center. Please try again.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden"
        style={{
          maxWidth: 640,
          width: "calc(100vw - 2rem)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          border: "1px solid var(--brc-border)",
          background: "white",
          boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
        }}
      >
        <DialogHeader
          style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--brc-border)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <DialogTitle
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--brc-text)",
                fontFamily: "var(--brc-font-ui)",
                lineHeight: 1.2,
              }}
            >
              {isEdit ? "Edit Inspection Center" : "New Inspection Center"}
            </DialogTitle>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)" }}>
              {isEdit ? "Update this center's details." : "Add a new physical inspection location."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "none",
              background: "var(--brc-bg-subtle)",
              cursor: "pointer",
            }}
          >
            <XIcon size={17} style={{ color: "var(--brc-text)" }} />
          </button>
        </DialogHeader>

        <form
          id="center-form"
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div>
            <label style={labelStyle}>Company name</label>
            <Input
              required
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder="e.g. Everything Cars Inspection Hub"
              className="h-10"
              style={{ fontFamily: "var(--brc-font-ui)" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Address</label>
            <Textarea
              required
              rows={2}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="e.g. 5 Marina Road, Lagos Island"
              style={{ fontFamily: "var(--brc-font-ui)" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <CountrySelect value={form.countryIso} onChange={handleCountryChange} label="Country" />
            <StateSelect country={countryName} value={form.state} onChange={handleStateChange} label="State" />
          </div>

          <CityCombobox
            country={countryName}
            state={form.state}
            value={form.city}
            onChange={(city) => update("city", city)}
            label="City"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Country code</label>
              <Input
                required
                value={form.country_code}
                onChange={(e) => update("country_code", e.target.value.toUpperCase())}
                placeholder="e.g. NG"
                maxLength={3}
                className="h-10 uppercase"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
              <p style={{ marginTop: 4, fontSize: 11, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)" }}>
                2–3 letters, e.g. NG or NGA.
              </p>
            </div>
            <div>
              <label style={labelStyle}>City code</label>
              <Input
                required
                value={form.city_code}
                onChange={(e) => update("city_code", e.target.value.toUpperCase())}
                placeholder="e.g. LOS"
                maxLength={3}
                className="h-10 uppercase"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
              <p style={{ marginTop: 4, fontSize: 11, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)" }}>
                Exactly 3 letters, e.g. LOS.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                className="h-10"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="e.g. lagos@inspections.com"
                className="h-10"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
            </div>
          </div>

          <div style={{ maxWidth: 200 }}>
            <label style={labelStyle}>Max reschedules</label>
            <Input
              type="number"
              required
              min={0}
              value={form.max_reschedules}
              onChange={(e) => update("max_reschedules", e.target.value)}
              className="h-10"
              style={{ fontFamily: "var(--brc-font-ui)" }}
            />
          </div>
        </form>

        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--brc-border)",
            padding: "16px 24px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            background: "white",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 8,
              border: "1px solid var(--brc-border)",
              background: "white",
              color: "var(--brc-text)",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--brc-font-ui)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="center-form"
            disabled={isPending || !!validationError}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 8,
              border: "none",
              background: "var(--brc-primary)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--brc-font-ui)",
              cursor: isPending || validationError ? "not-allowed" : "pointer",
              opacity: isPending || validationError ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isPending && <Loader2Icon size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {isEdit ? "Save Changes" : "Create Center"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Deactivate/Reactivate confirm dialog ──

function ConfirmToggleDialog({
  center,
  onClose,
}: {
  center: InspectionCenter | null;
  onClose: () => void;
}) {
  const updateCenter = useUpdateCenter();
  const willDeactivate = center?.is_active ?? true;

  async function handleConfirm() {
    if (!center) return;
    try {
      await updateCenter.mutateAsync({ centerId: center.id, is_active: !center.is_active });
      toast.success(willDeactivate ? "Inspection center deactivated." : "Inspection center reactivated.");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update inspection center status.",
      );
    }
  }

  return (
    <Dialog open={!!center} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden"
        style={{
          maxWidth: 420,
          width: "calc(100vw - 2rem)",
          borderRadius: 16,
          border: "1px solid var(--brc-border)",
          background: "white",
          boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
        }}
      >
        <div style={{ padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--brc-text)", fontFamily: "var(--brc-font-ui)" }}>
            {willDeactivate ? "Deactivate center?" : "Reactivate center?"}
          </h3>
          <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)", lineHeight: 1.5 }}>
            {willDeactivate
              ? `${center?.company_name} will no longer be selectable when creating new inspection slots. Existing slots are unaffected.`
              : `${center?.company_name} will become available again when creating new inspection slots.`}
          </p>
        </div>
        <div
          style={{
            borderTop: "1px solid var(--brc-border)",
            padding: "16px 24px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 8,
              border: "1px solid var(--brc-border)",
              background: "white",
              color: "var(--brc-text)",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--brc-font-ui)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={updateCenter.isPending}
            onClick={handleConfirm}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 8,
              border: "none",
              background: willDeactivate ? "var(--brc-danger)" : "var(--brc-success)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--brc-font-ui)",
              cursor: updateCenter.isPending ? "not-allowed" : "pointer",
              opacity: updateCenter.isPending ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {updateCenter.isPending && <Loader2Icon size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {willDeactivate ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──

export default function AdminInspectionCentersPage() {
  const { data, isLoading } = useAdminCenters({ page_size: 100 });
  const centers = data?.results ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<InspectionCenter | null>(null);
  const [toggleCenter, setToggleCenter] = useState<InspectionCenter | null>(null);

  function openCreate() {
    setEditingCenter(null);
    setFormOpen(true);
  }

  function openEdit(center: InspectionCenter) {
    setEditingCenter(center);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingCenter(null);
  }

  return (
    <>
      {/* Hero band */}
      <section style={{ borderBottom: "1px solid var(--brc-border)", background: "white" }}>
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "40px var(--brc-space-10, 40px) 32px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div>
            <Link
              href="/admin/inspections"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--brc-text-muted)",
                fontFamily: "var(--brc-font-ui)",
                textDecoration: "none",
                marginBottom: 12,
              }}
            >
              <ArrowLeftIcon size={14} />
              Back to Slot Management
            </Link>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--brc-text-muted)",
                fontFamily: "var(--brc-font-ui)",
              }}
            >
              Admin · Center Management
            </span>
            <h1
              style={{
                margin: "12px 0 0",
                fontSize: "clamp(32px, 5vw, 44px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--brc-text)",
                fontFamily: "var(--brc-font-display, var(--brc-font-ui))",
              }}
            >
              Inspection Centers
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 15,
                lineHeight: 1.6,
                color: "var(--brc-text-muted)",
                fontFamily: "var(--brc-font-ui)",
              }}
            >
              Manage physical inspection locations used across slot booking.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 46,
              padding: "0 22px",
              borderRadius: 10,
              border: "none",
              background: "var(--brc-primary)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--brc-font-ui)",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,139,0.20)",
            }}
          >
            <PlusIcon size={16} />
            New Center
          </button>
        </div>
      </section>

      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "32px var(--brc-space-10, 40px)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton className="h-12 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : centers.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: "64px 24px",
              border: "1px dashed var(--brc-border)",
              borderRadius: 16,
              background: "white",
            }}
          >
            <BuildingIcon size={28} style={{ color: "var(--brc-text-muted)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--brc-text)", fontFamily: "var(--brc-font-ui)" }}>
              No inspection centers yet
            </span>
            <p style={{ margin: 0, fontSize: 13, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)", textAlign: "center", maxWidth: 360 }}>
              Create your first inspection center so staff can generate slots for owners to book.
            </p>
            <button
              type="button"
              onClick={openCreate}
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 40,
                padding: "0 18px",
                borderRadius: 10,
                border: "none",
                background: "var(--brc-primary)",
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "var(--brc-font-ui)",
                cursor: "pointer",
              }}
            >
              <PlusIcon size={14} />
              New Center
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "white",
              border: "1px solid var(--brc-border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table className="w-full border-collapse" style={{ minWidth: 860 }}>
                <thead>
                  <tr style={{ background: "var(--brc-bg-subtle)" }}>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Company</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Location</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Codes</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Contact</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Max reschedules</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Status</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {centers.map((center, i) => (
                    <tr
                      key={center.id}
                      style={{ borderBottom: i === centers.length - 1 ? "none" : "1px solid var(--brc-border)" }}
                    >
                      <td className="px-4 py-3">
                        <span className="block text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                          {center.company_name}
                        </span>
                        <span className="block max-w-[260px] truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          {center.address}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                        {center.city}, {center.state}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" style={{ fontFamily: "var(--brc-font-ui)" }}>{center.country_code}</Badge>
                          <Badge variant="outline" style={{ fontFamily: "var(--brc-font-ui)" }}>{center.city_code}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                        <span className="block">{center.phone || "—"}</span>
                        <span className="block truncate max-w-[200px] text-xs text-(--brc-text-muted)">{center.email || "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {center.max_reschedules}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold [font-family:var(--brc-font-ui)]"
                          style={{
                            background: center.is_active ? "var(--brc-success-bg, #d4edda)" : "var(--brc-bg-muted)",
                            color: center.is_active ? "var(--brc-success)" : "var(--brc-text-muted)",
                          }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: center.is_active ? "var(--brc-success)" : "var(--brc-text-muted)" }}
                          />
                          {center.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(center)}
                            aria-label="Edit center"
                            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white transition-colors hover:bg-(--brc-bg-subtle)"
                          >
                            <PencilIcon size={14} style={{ color: "var(--brc-text)" }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setToggleCenter(center)}
                            aria-label={center.is_active ? "Deactivate center" : "Reactivate center"}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors"
                            style={{
                              borderColor: center.is_active ? "var(--brc-danger)" : "var(--brc-success)",
                              background: "white",
                            }}
                          >
                            <PowerIcon
                              size={14}
                              style={{ color: center.is_active ? "var(--brc-danger)" : "var(--brc-success)" }}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <CenterFormDialog open={formOpen} onClose={closeForm} center={editingCenter} />
      <ConfirmToggleDialog center={toggleCenter} onClose={() => setToggleCenter(null)} />
    </>
  );
}
