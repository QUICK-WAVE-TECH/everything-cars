"use client";

import { MailIcon, PhoneIcon, RotateCcwIcon, ShieldCheckIcon } from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

import type { DisputeDeal } from "../api";
import { PILL, buildTimeline, money } from "../lib/dispute-format";

type Props = {
  deal: DisputeDeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUphold: () => void;
  onDismiss: () => void;
};

const label =
  "text-[11px] font-semibold uppercase tracking-[0.07em] [font-family:var(--font-geist-sans)]";
const contact =
  "flex items-center gap-2 text-[12.5px] text-(--brc-text-secondary) [font-family:var(--font-geist-sans)]";

function ContactCard({
  role,
  roleClass,
  party,
}: {
  role: string;
  roleClass: string;
  party: DisputeDeal["buyer"];
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-(--brc-radius-lg) bg-(--brc-bg) p-4 ring-1 ring-(--brc-border)">
      <span className={`${label} ${roleClass}`}>{role}</span>
      <span className="text-[15px] font-bold text-(--brc-text)">{party.name}</span>
      <div className="flex flex-col gap-1.5">
        <span className={contact}>
          <PhoneIcon className="size-3.5 shrink-0 text-(--brc-text-muted)" />
          {party.phone || "—"}
        </span>
        <span className={`${contact} break-all`}>
          <MailIcon className="size-3.5 shrink-0 text-(--brc-text-muted)" />
          {party.email}
        </span>
      </div>
    </div>
  );
}

export function DisputeDetailSheet({
  deal,
  open,
  onOpenChange,
  onUphold,
  onDismiss,
}: Props) {
  const pill = deal ? PILL[deal.dispute_status] : null;
  const timeline = deal ? buildTimeline(deal) : [];
  const canResolve = deal?.dispute_status === "open";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        // The Sheet base caps a right drawer at `data-[side=right]:sm:max-w-sm`
        // (384px); override the *same* variant selector so this actually wins.
        className="w-full gap-0 bg-(--brc-bg) p-0 data-[side=right]:sm:w-[92vw] data-[side=right]:sm:max-w-[720px]"
      >
        {deal && pill ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-(--brc-border) p-6 pr-14">
              <div className="flex flex-col gap-2">
                <span className={`${label} text-(--brc-text-muted)`}>
                  Dispute case
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xl font-extrabold text-(--brc-text)">
                    {deal.ref}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-[11.5px] [font-family:var(--font-geist-sans)] ${pill.className}`}
                  >
                    <span className={`size-3.5 rounded-full ${pill.dot}`} />
                    {pill.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {/* Car + amount */}
              <div className="flex flex-wrap items-center gap-4 rounded-(--brc-radius-lg) bg-(--brc-bg-subtle) p-3.5 ring-1 ring-(--brc-border)">
                <div
                  role="img"
                  aria-label={deal.car.title}
                  className="h-[76px] w-[104px] shrink-0 rounded-(--brc-radius-md) bg-(--brc-bg-muted) bg-cover bg-center"
                  style={
                    deal.car.primary_image
                      ? { backgroundImage: `url(${deal.car.primary_image})` }
                      : undefined
                  }
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[17px] leading-tight font-extrabold text-(--brc-text)">
                    {deal.car.title}
                  </span>
                  <span className="text-xs text-(--brc-text-muted) [font-family:var(--font-geist-sans)]">
                    {deal.car.subtitle}
                  </span>
                </div>
                <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--font-geist-sans)]">
                    Agreed amount
                  </span>
                  <span className="text-[22px] leading-none font-extrabold text-(--brc-text) tabular-nums">
                    {money(deal)}
                  </span>
                </div>
              </div>

              {/* Parties */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ContactCard
                  role="Buyer — complainant"
                  roleClass="text-(--brc-accent)"
                  party={deal.buyer}
                />
                <ContactCard
                  role={`Seller${
                    deal.seller.business_name
                      ? ` — ${deal.seller.business_name}`
                      : ""
                  }`}
                  roleClass="text-(--brc-primary)"
                  party={deal.seller}
                />
              </div>

              {/* Timeline */}
              <div className="flex flex-col gap-3.5">
                <span className="text-[13px] font-bold text-(--brc-text)">
                  Case timeline
                </span>
                <div className="flex flex-col">
                  {timeline.map((ev, i) => (
                    <div
                      key={ev.label}
                      className="grid grid-cols-[26px_1fr] gap-x-3"
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className={`mt-1 size-[11px] shrink-0 rounded-full ring-3 ring-(--brc-bg) ${ev.dot}`}
                        />
                        {i < timeline.length - 1 && (
                          <span className="min-h-[18px] w-px flex-1 bg-(--brc-border)" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 pb-4">
                        <span className="text-[13.5px] font-bold text-(--brc-text)">
                          {ev.label}
                        </span>
                        <span className="text-xs text-(--brc-text-muted) [font-family:var(--font-geist-sans)]">
                          {ev.abs} · {ev.rel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buyer's reason */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-bold text-(--brc-text)">
                  Buyer&apos;s reason for disputing
                </span>
                <blockquote className="rounded-(--brc-radius-md) border-l-[3px] border-(--brc-warning) bg-(--brc-warning-bg) px-4.5 py-4 text-[14.5px] leading-relaxed text-(--brc-accent)">
                  {deal.dispute_reason || "No reason was provided."}
                </blockquote>
              </div>

              {/* Resolution (if resolved) */}
              {deal.dispute_status !== "open" && deal.resolution_note && (
                <div className="flex flex-col gap-2 rounded-(--brc-radius-md) bg-(--brc-bg-subtle) p-4 ring-1 ring-(--brc-border)">
                  <span
                    className={`${label} text-(--brc-text-muted)`}
                  >
                    Resolution
                    {deal.resolved_by_name ? ` — ${deal.resolved_by_name}` : ""}
                  </span>
                  <span className="text-sm leading-relaxed text-(--brc-text-secondary)">
                    {deal.resolution_note}
                  </span>
                </div>
              )}
            </div>

            {/* Footer actions */}
            {canResolve && (
              <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-(--brc-border) bg-(--brc-bg) p-4">
                <Button
                  variant="outline"
                  className="h-12 flex-1 basis-[200px] font-bold"
                  onClick={onDismiss}
                >
                  <ShieldCheckIcon />
                  Dismiss dispute
                </Button>
                <Button
                  variant="destructive"
                  className="h-12 flex-1 basis-[200px] font-bold"
                  onClick={onUphold}
                >
                  <RotateCcwIcon />
                  Uphold &amp; reverse
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
