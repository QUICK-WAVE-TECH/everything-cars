"use client";

import Image from "next/image";
import { FileTextIcon, IdCardIcon } from "lucide-react";
import { useStaffBookingDetail } from "@/features/inspections/api/inspections-api";
import { idTypeLabel } from "@/features/auth/schemas";

const ATTENDEE_LABEL: Record<string, string> = {
  owner: "Owner",
  representative: "Declared representative",
  other: "Someone else (undeclared)",
};

function FileChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3 py-2 text-xs font-bold text-(--brc-primary) no-underline transition hover:bg-(--brc-primary-tint) [font-family:var(--brc-font-ui)]"
    >
      <FileTextIcon size={13} />
      {label}
    </a>
  );
}

/** Staff-only view of what the inspector recorded/uploaded for a booking. */
export function InspectionRecordPanel({ bookingId }: { bookingId: string | null }) {
  const { data: booking } = useStaffBookingDetail(bookingId);
  const insp = booking?.inspection;
  if (!insp) return null;
  const docs = insp.documents;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        Inspection record
      </h3>
      <div className="flex flex-col gap-3 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 [font-family:var(--brc-font-ui)]">
        {/* Who presented + their ID */}
        <div className="flex items-start gap-2 text-sm">
          <IdCardIcon size={16} className="mt-0.5 shrink-0 text-(--brc-text-muted)" />
          <div className="min-w-0">
            <span className="font-bold text-(--brc-text)">
              Presented: {ATTENDEE_LABEL[insp.presented_attendee] ?? "—"}
            </span>
            {insp.presented_id_number && (
              <span className="block text-xs text-(--brc-text-secondary)">
                {idTypeLabel(insp.presented_id_type) || "ID"} · {insp.presented_id_number}
              </span>
            )}
          </div>
        </div>

        {/* Uploaded files */}
        <div className="flex flex-wrap items-center gap-2">
          {insp.presented_id_document ? (
            <a
              href={insp.presented_id_document}
              target="_blank"
              rel="noreferrer"
              className="group relative block size-16 overflow-hidden rounded-lg border border-(--brc-border) bg-white"
              title="View presented ID"
            >
              <Image
                src={insp.presented_id_document}
                alt="Presented ID"
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </a>
          ) : (
            <span className="text-xs text-(--brc-text-muted)">No ID photo uploaded.</span>
          )}
          {docs?.car_documents && (
            <FileChip href={docs.car_documents} label="Car documents" />
          )}
          {docs?.receipt_upload && (
            <FileChip href={docs.receipt_upload} label="Receipt" />
          )}
        </div>

        <span className="text-[11px] text-(--brc-text-muted)">
          Inspected by {insp.inspector_name || "staff"} · staff-only
        </span>
      </div>
    </section>
  );
}
