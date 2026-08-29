"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PlusIcon,
  XIcon,
  Loader2Icon,
  PencilIcon,
  PowerIcon,
  BuildingIcon,
  CalendarPlusIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  Trash2Icon,
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  useAdminCenters,
  useCreateCenter,
  useDeleteCenter,
  useUpdateCenter,
} from "@/features/inspections/api/inspections-api";
import type { InspectionCenter } from "@/features/inspections/api/types";
import { CountrySelect } from "@/features/auth/components/country-select";
import { StateSelect } from "@/features/auth/components/state-select";
import { CityCombobox } from "@/features/auth/components/city-combobox";
import { COUNTRIES } from "@/features/auth/data/countries";

const labelClass =
  "mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]";

function countryNameFromIso(iso: string): string {
  return COUNTRIES.find((c) => c.iso.toLowerCase() === iso.toLowerCase())?.name ?? "";
}

function isoFromCountryValue(country: string): string {
  const byIso = COUNTRIES.find((c) => c.iso.toLowerCase() === country.toLowerCase());
  if (byIso) return byIso.iso;
  const byName = COUNTRIES.find((c) => c.name.toLowerCase() === country.toLowerCase());
  return byName?.iso ?? "ng";
}

// ── Form state ──

type CenterFormState = {
  company_name: string;
  address: string;
  countryIso: string;
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

  // Re-seed the form when the dialog opens or the target changes.
  const formKey = open ? (center?.id ?? "new") : "closed";
  const [prevFormKey, setPrevFormKey] = useState(formKey);
  if (prevFormKey !== formKey) {
    setPrevFormKey(formKey);
    if (open) setForm(center ? centerToForm(center) : EMPTY_FORM);
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
        toast.success("Inspection center created — add slots to open it for booking.");
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
        className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-3xl border border-(--brc-border) bg-white p-0 shadow-[0_28px_70px_rgba(18,18,18,0.22)] sm:max-w-[640px]"
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-(--brc-border) px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-(--brc-primary-tint) text-(--brc-primary)">
              <BuildingIcon size={20} />
            </span>
            <div>
              <DialogTitle className="text-lg font-black leading-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                {isEdit ? "Edit Inspection Center" : "New Inspection Center"}
              </DialogTitle>
              <p className="mt-0.5 text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {isEdit ? "Update this center's details." : "Add a new physical inspection location."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-(--brc-bg-subtle) text-(--brc-text) transition-colors hover:bg-(--brc-bg-muted)"
          >
            <XIcon size={17} />
          </button>
        </DialogHeader>

        <form
          id="center-form"
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6"
        >
          <div>
            <label className={labelClass}>Company name</label>
            <Input
              required
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder="e.g. Everything Cars Inspection Hub"
              className="h-11"
              style={{ fontFamily: "var(--brc-font-ui)" }}
            />
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <Textarea
              required
              rows={2}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="e.g. 5 Marina Road, Lagos Island"
              style={{ fontFamily: "var(--brc-font-ui)" }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Country code</label>
              <Input
                required
                value={form.country_code}
                onChange={(e) => update("country_code", e.target.value.toUpperCase())}
                placeholder="e.g. NG"
                maxLength={3}
                className="h-11 uppercase"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
              <p className="mt-1 text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                2–3 letters, e.g. NG or NGA.
              </p>
            </div>
            <div>
              <label className={labelClass}>City code</label>
              <Input
                required
                value={form.city_code}
                onChange={(e) => update("city_code", e.target.value.toUpperCase())}
                placeholder="e.g. LOS"
                maxLength={3}
                className="h-11 uppercase"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
              <p className="mt-1 text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                Exactly 3 letters, e.g. LOS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                className="h-11"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="e.g. lagos@inspections.com"
                className="h-11"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
            </div>
          </div>

          <div className="max-w-[200px]">
            <label className={labelClass}>Max reschedules</label>
            <Input
              type="number"
              required
              min={0}
              value={form.max_reschedules}
              onChange={(e) => update("max_reschedules", e.target.value)}
              className="h-11"
              style={{ fontFamily: "var(--brc-font-ui)" }}
            />
          </div>
        </form>

        <div className="flex shrink-0 justify-end gap-2.5 border-t border-(--brc-border) bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 cursor-pointer rounded-xl border border-(--brc-border) bg-white px-5 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="center-form"
            disabled={isPending || !!validationError}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border-none bg-(--brc-primary) px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,0,139,0.22)] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [font-family:var(--brc-font-ui)]"
          >
            {isPending && <Loader2Icon size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Create Center"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Deactivate/Reactivate confirm ──

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
    <ConfirmDialog
      open={!!center}
      onOpenChange={(next: boolean) => { if (!next) onClose(); }}
      title={willDeactivate ? "Deactivate center?" : "Reactivate center?"}
      description={
        willDeactivate
          ? `${center?.company_name} will no longer be selectable when creating new inspection slots. Existing slots are unaffected.`
          : `${center?.company_name} will become available again when creating new inspection slots.`
      }
      confirmLabel={willDeactivate ? "Deactivate" : "Reactivate"}
      destructive={willDeactivate}
      isPending={updateCenter.isPending}
      onConfirm={handleConfirm}
    />
  );
}

// ── Center card ──

function CenterCard({
  center,
  onEdit,
  onToggle,
  onDelete,
  onAddSlots,
}: {
  center: InspectionCenter;
  onEdit: (center: InspectionCenter) => void;
  onToggle: (center: InspectionCenter) => void;
  onDelete: (center: InspectionCenter) => void;
  onAddSlots: (center: InspectionCenter) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border bg-white p-5 shadow-[0_14px_38px_rgba(18,18,18,0.06)] transition-shadow hover:shadow-[0_20px_48px_rgba(18,18,18,0.1)]",
        center.is_active ? "border-(--brc-border)" : "border-dashed border-(--brc-border) opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-(--brc-primary-tint) text-(--brc-primary)">
            <BuildingIcon size={20} />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 truncate text-[15px] font-black text-(--brc-text) [font-family:var(--brc-font-ui)]">
              {center.company_name}
            </h3>
            <span className="block truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              {center.address}
            </span>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold [font-family:var(--brc-font-ui)]"
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
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-[13px] text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
        <span className="flex items-center gap-2">
          <MapPinIcon size={14} className="shrink-0 text-(--brc-text-muted)" />
          {center.city}, {center.state}
        </span>
        <span className="flex items-center gap-2">
          <PhoneIcon size={14} className="shrink-0 text-(--brc-text-muted)" />
          {center.phone || "—"}
        </span>
        <span className="flex items-center gap-2">
          <MailIcon size={14} className="shrink-0 text-(--brc-text-muted)" />
          <span className="truncate">{center.email || "—"}</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" style={{ fontFamily: "var(--brc-font-ui)" }}>{center.country_code}</Badge>
        <Badge variant="outline" style={{ fontFamily: "var(--brc-font-ui)" }}>{center.city_code}</Badge>
        <Badge variant="outline" style={{ fontFamily: "var(--brc-font-ui)" }}>
          {center.max_reschedules} reschedules
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-(--brc-border) pt-4">
        <button
          type="button"
          onClick={() => onAddSlots(center)}
          disabled={!center.is_active}
          aria-label="Add slots"
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-(--brc-primary) text-white shadow-[0_8px_18px_rgba(0,0,139,0.18)] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          title={center.is_active ? "Add slots to this center" : "Reactivate the center to add slots"}
        >
          <CalendarPlusIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => onEdit(center)}
          aria-label="Edit center"
          className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-(--brc-border) bg-white text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle)"
        >
          <PencilIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => onToggle(center)}
          aria-label={center.is_active ? "Deactivate center" : "Reactivate center"}
          className="flex size-10 cursor-pointer items-center justify-center rounded-xl border bg-white transition-colors"
          style={{ borderColor: center.is_active ? "var(--brc-danger)" : "var(--brc-success)" }}
        >
          <PowerIcon
            size={15}
            style={{ color: center.is_active ? "var(--brc-danger)" : "var(--brc-success)" }}
          />
        </button>
        <button
          type="button"
          onClick={() => onDelete(center)}
          aria-label="Delete center"
          title="Delete center"
          className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-(--brc-danger) bg-white text-(--brc-danger) transition-colors hover:bg-(--brc-danger-bg)"
        >
          <Trash2Icon size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Panel ──

export function CentersPanel({
  onAddSlots,
}: {
  onAddSlots: (center: InspectionCenter) => void;
}) {
  const { data, isLoading } = useAdminCenters({ page_size: 100 });
  const centers = data?.results ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<InspectionCenter | null>(null);
  const [toggleCenter, setToggleCenter] = useState<InspectionCenter | null>(null);
  const [deleteCenter, setDeleteCenter] = useState<InspectionCenter | null>(null);
  const deleteMutation = useDeleteCenter();

  function confirmDelete() {
    if (!deleteCenter) return;
    deleteMutation.mutate(deleteCenter.id, {
      onSuccess: (res) => {
        toast.success(
          res.cancelled > 0
            ? `Center deleted · ${res.cancelled} upcoming appointment${res.cancelled === 1 ? "" : "s"} cancelled.`
            : "Center deleted.",
        );
        setDeleteCenter(null);
      },
      onError: (error) =>
        toast.error(
          error instanceof ApiError ? error.message : "Couldn't delete the center.",
        ),
    });
  }

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-lg font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
            Inspection Centers
          </h2>
          <p className="mt-1 text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Manage locations and add booking slots to each one.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-(--brc-primary) px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,0,139,0.2)] transition-all hover:brightness-95 [font-family:var(--brc-font-ui)]"
        >
          <PlusIcon size={16} /> New Center
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-3xl" />
          ))}
        </div>
      ) : centers.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 rounded-3xl border border-dashed border-(--brc-border) bg-white px-6 py-16 text-center">
          <BuildingIcon size={28} className="text-(--brc-text-muted)" />
          <span className="text-[15px] font-black text-(--brc-text) [font-family:var(--brc-font-ui)]">
            No inspection centers yet
          </span>
          <p className="m-0 max-w-[360px] text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Create your first inspection center, then add slots so owners can book.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-2 flex h-10 cursor-pointer items-center gap-2 rounded-xl border-none bg-(--brc-primary) px-4 text-[13px] font-bold text-white transition-all hover:brightness-95 [font-family:var(--brc-font-ui)]"
          >
            <PlusIcon size={14} /> New Center
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {centers.map((center) => (
            <CenterCard
              key={center.id}
              center={center}
              onEdit={openEdit}
              onToggle={setToggleCenter}
              onDelete={setDeleteCenter}
              onAddSlots={onAddSlots}
            />
          ))}
        </div>
      )}

      <CenterFormDialog open={formOpen} onClose={closeForm} center={editingCenter} />
      <ConfirmToggleDialog center={toggleCenter} onClose={() => setToggleCenter(null)} />

      <ConfirmDialog
        open={deleteCenter !== null}
        onOpenChange={(open) => !open && !deleteMutation.isPending && setDeleteCenter(null)}
        title="Delete this center?"
        description={
          <>
            {deleteCenter && deleteCenter.booking_count > 0 ? (
              <>
                <strong>{deleteCenter.booking_count}</strong> upcoming appointment
                {deleteCenter.booking_count === 1 ? "" : "s"} at this center will be
                cancelled and those owners emailed to rebook elsewhere.{" "}
              </>
            ) : null}
            Past inspection records are kept. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete center"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
