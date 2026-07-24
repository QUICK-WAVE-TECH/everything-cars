"use client";

import Image from "next/image";
import {
  ExternalLinkIcon,
  FileTextIcon,
  IdCardIcon,
} from "lucide-react";
import { useStaffBookingDetail } from "@/features/inspections/api/inspections-api";
import { idTypeLabel } from "@/features/auth/schemas";

const ATTENDEE_LABEL: Record<string, string> = {
  owner: "Owner",
  representative: "Declared representative",
  other: "Someone else (undeclared)",
};

function FileCard({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex min-h-24 min-w-0 items-center gap-3 rounded-lg border border-(--brc-border) bg-white p-4 text-(--brc-text) no-underline transition-colors hover:border-(--brc-primary)/30 hover:bg-(--brc-primary-tint) [font-family:var(--brc-font-ui)]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
        <FileTextIcon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{label}</strong>
        <span className="mt-1 block text-xs text-(--brc-text-muted)">
          Open file in a new tab
        </span>
      </span>
      <ExternalLinkIcon
        size={16}
        className="shrink-0 text-(--brc-text-muted) transition-colors group-hover:text-(--brc-primary)"
      />
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
      <div className="flex flex-col gap-5 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-4 sm:p-5 [font-family:var(--brc-font-ui)]">
        {/* Who presented + their ID */}
        <div className="flex items-start gap-3 border-b border-(--brc-border) pb-4 text-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-(--brc-primary)">
            <IdCardIcon size={18} />
          </span>
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
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase text-(--brc-text-muted)">
            Uploaded files
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {insp.presented_id_document ? (
            <a
              href={insp.presented_id_document}
              target="_blank"
              rel="noreferrer"
              className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-(--brc-border) bg-white no-underline transition-colors hover:border-(--brc-primary)/30"
              title="View presented ID"
            >
              <span className="relative block aspect-[16/10] w-full bg-(--brc-bg-muted) p-2">
                <Image
                  src={insp.presented_id_document}
                  alt="Presented ID"
                  fill
                  sizes="(max-width: 640px) 100vw, 300px"
                  className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </span>
              <span className="flex items-center justify-between gap-2 border-t border-(--brc-border) px-3 py-2.5">
                <span className="truncate text-xs font-bold text-(--brc-text)">
                  Presented ID
                </span>
                <ExternalLinkIcon
                  size={14}
                  className="shrink-0 text-(--brc-text-muted) group-hover:text-(--brc-primary)"
                />
              </span>
            </a>
          ) : (
            <div className="flex min-h-24 items-center rounded-lg border border-dashed border-(--brc-border-strong) bg-white px-4 text-xs text-(--brc-text-muted)">
              No ID photo uploaded.
            </div>
          )}
          {docs?.car_documents && (
            <FileCard href={docs.car_documents} label="Car documents" />
          )}
          {docs?.receipt_upload && (
            <FileCard href={docs.receipt_upload} label="Receipt" />
          )}
          </div>
        </div>

        <span className="border-t border-(--brc-border) pt-3 text-[11px] text-(--brc-text-muted)">
          Inspected by{" "}
          <span className="font-semibold text-(--brc-text-secondary)">
            {insp.inspector_name || insp.inspector_email || "staff"}
          </span>{" "}
          · staff-only
        </span>
      </div>
    </section>
  );
}
