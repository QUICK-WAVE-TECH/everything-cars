"use client";

import { useMemo, useState } from "react";
import {
  BuildingIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedTabs } from "@/shared/motion/segmented-tabs";
import { StaggerGroup, StaggerItem } from "@/shared/motion/stagger";
import { RevealOnce } from "@/shared/motion/reveal-once";
import {
  useAdminCenters,
  useStaffSlots,
} from "@/features/inspections/api/inspections-api";
import type { InspectionCenter } from "@/features/inspections/api/types";
import { AssistanceQueue } from "@/features/inspections/components/assistance-queue";
import { CreateSlotsModal } from "@/features/inspections/components/create-slots-modal";
import { CentersPanel } from "@/features/inspections/components/centers-panel";
import { DayActivitySheet } from "@/features/inspections/components/day-activity-sheet";
import { WeekGrid } from "./week-grid";
import { DayPanel } from "./day-panel";
import {
  formatWeekRange,
  getWeekDays,
  getWeekStart,
  slotStatus,
  toIsoDate,
  weekKpis,
} from "./schedule-helpers";

type Section = "schedule" | "centers";
type View = "week" | "day";

const SELECT_CLASS =
  "h-9 rounded-xl border border-(--brc-border) bg-white px-3 text-[13px] font-bold text-(--brc-text) outline-none [font-family:var(--brc-font-ui)]";

// ── Live sync dot ──
function LiveSync({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-bold text-(--brc-success) [font-family:var(--brc-font-ui)]">
      <span className="relative flex size-2.5">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--brc-success) opacity-60 motion-reduce:hidden" />
        )}
        <span className="relative inline-flex size-2.5 rounded-full bg-(--brc-success)" />
      </span>
      Live sync
    </span>
  );
}

// ── KPI row ──
function Kpis({
  kpis,
}: {
  kpis: ReturnType<typeof weekKpis>;
}) {
  const tiles = [
    { label: "Total slots", value: kpis.total, color: "var(--brc-text)" },
    { label: "Open", value: kpis.open, color: "var(--brc-primary)" },
    { label: "Partially booked", value: kpis.partial, color: "#9a7400" },
    { label: "Full", value: kpis.full, color: "var(--brc-success)" },
    { label: "Bookings", value: kpis.bookings, color: "var(--brc-text)" },
  ];
  return (
    <StaggerGroup className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-(--brc-border) bg-(--brc-border) sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <StaggerItem key={t.label} className="bg-white">
          <div className="flex flex-col gap-1 px-4 py-3.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              {t.label}
            </span>
            <span
              className="text-[26px] font-black leading-none tabular-nums [font-family:var(--brc-font-display)]"
              style={{ color: t.color }}
            >
              {t.value}
            </span>
          </div>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}

// ── Left rail ──
const NAV: { key: Section; label: string; icon: typeof CalendarDaysIcon }[] = [
  { key: "schedule", label: "Schedule", icon: CalendarDaysIcon },
  { key: "centers", label: "Centers", icon: BuildingIcon },
];

function Sidebar({
  section,
  onChange,
}: {
  section: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden self-start lg:sticky lg:top-[92px] lg:flex lg:flex-col lg:gap-1">
        <span className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          Inspection Operations
        </span>
        {NAV.map((item) => {
          const active = section === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-bold transition-colors [font-family:var(--brc-font-ui)]",
                active
                  ? "bg-(--brc-primary-tint) text-(--brc-primary)"
                  : "text-(--brc-text-secondary) hover:bg-(--brc-bg-subtle)",
              )}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </aside>

      {/* Mobile switch */}
      <div className="lg:hidden">
        <SegmentedTabs
          options={NAV.map((n) => ({ value: n.key, label: n.label }))}
          value={section}
          onChange={(v) => onChange(v)}
          groupId="inspection-section"
        />
      </div>
    </>
  );
}

export function ScheduleConsole() {
  const [section, setSection] = useState<Section>("schedule");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [view, setView] = useState<View>("week");
  const [selectedIso, setSelectedIso] = useState(() => toIsoDate(new Date()));
  const [centerFilter, setCenterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sheetDate, setSheetDate] = useState<string | null>(null);

  const [slotsModalOpen, setSlotsModalOpen] = useState(false);
  const [lockedCenter, setLockedCenter] = useState<InspectionCenter | null>(null);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const dateFrom = toIsoDate(days[0]!);
  const dateTo = toIsoDate(days[days.length - 1]!);

  const { data, isLoading, isFetching } = useStaffSlots({
    date_from: dateFrom,
    date_to: dateTo,
    is_active: "true",
    page_size: 100,
  });
  const { data: centersData } = useAdminCenters({ is_active: "true", page_size: 100 });
  const centers = centersData?.results ?? [];

  const allSlots = useMemo(() => data?.results ?? [], [data]);
  const filteredSlots = useMemo(
    () =>
      allSlots.filter((s) => {
        if (centerFilter && s.center.id !== centerFilter) return false;
        if (statusFilter && slotStatus(s) !== statusFilter) return false;
        return true;
      }),
    [allSlots, centerFilter, statusFilter],
  );

  const kpis = useMemo(() => weekKpis(filteredSlots), [filteredSlots]);
  const selectedDaySlots = useMemo(
    () => filteredSlots.filter((s) => s.date === selectedIso),
    [filteredSlots, selectedIso],
  );
  const gridDays = useMemo(
    () => (view === "day" ? [new Date(`${selectedIso}T00:00:00`)] : days),
    [view, selectedIso, days],
  );

  const weekLabel = formatWeekRange(days[0]!, days[days.length - 1]!);
  const isCurrentWeek = toIsoDate(weekStart) === toIsoDate(getWeekStart(new Date()));

  function shiftWeek(delta: number) {
    setWeekStart((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() + delta * 7);
      setSelectedIso(toIsoDate(d)); // land on the Monday of the new week
      return d;
    });
  }
  function goToday() {
    const now = new Date();
    setWeekStart(getWeekStart(now));
    setSelectedIso(toIsoDate(now));
  }

  function openCreateSlots() {
    setLockedCenter(null);
    setSlotsModalOpen(true);
  }
  function openAddSlotsForCenter(center: InspectionCenter) {
    setLockedCenter(center);
    setSlotsModalOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_340px]">
        <Sidebar section={section} onChange={setSection} />

        {/* Main column */}
        <main className="flex min-w-0 flex-col gap-5">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                Inspection Operations
              </span>
              <h1 className="mt-1 text-[clamp(26px,4vw,36px)] font-black leading-none tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                {section === "schedule" ? "Schedule" : "Centers"}
              </h1>
              <p className="mt-1.5 text-[14px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {section === "schedule"
                  ? "Manage capacity, bookings and center availability"
                  : "Add, edit and retire inspection centers"}
              </p>
            </div>
            {section === "schedule" && <LiveSync active={isFetching} />}
          </div>

          {section === "schedule" ? (
            <>
              <Kpis kpis={kpis} />

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => shiftWeek(-1)}
                    aria-label="Previous week"
                    className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-(--brc-border) bg-white text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle)"
                  >
                    <ChevronLeftIcon size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftWeek(1)}
                    aria-label="Next week"
                    className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-(--brc-border) bg-white text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle)"
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-(--brc-border) bg-white px-3 py-2 text-[13px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  <CalendarDaysIcon size={14} className="text-(--brc-text-muted)" />
                  {weekLabel}
                </span>
                {!isCurrentWeek && (
                  <button
                    type="button"
                    onClick={goToday}
                    className="h-9 cursor-pointer rounded-xl border border-(--brc-border) bg-white px-3.5 text-[13px] font-bold text-(--brc-text-muted) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
                  >
                    Today
                  </button>
                )}

                <select
                  value={centerFilter}
                  onChange={(e) => setCenterFilter(e.target.value)}
                  aria-label="Filter by center"
                  className={SELECT_CLASS}
                >
                  <option value="">All centers</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                      {c.city ? ` · ${c.city}` : ""}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className={SELECT_CLASS}
                >
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="partial">Partially booked</option>
                  <option value="full">Full</option>
                </select>

                <div className="ml-auto flex items-center gap-2.5">
                  <SegmentedTabs
                    options={[
                      { value: "week", label: "Week" },
                      { value: "day", label: "Day" },
                    ]}
                    value={view}
                    onChange={(v) => setView(v)}
                    groupId="schedule-view"
                  />
                  <button
                    type="button"
                    onClick={openCreateSlots}
                    className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border-none bg-(--brc-primary) px-4 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,139,0.2)] transition-all hover:brightness-95 [font-family:var(--brc-font-ui)]"
                  >
                    <PlusIcon size={16} /> Create slots
                  </button>
                </div>
              </div>

              <AssistanceQueue />

              <RevealOnce>
                <WeekGrid
                  slots={filteredSlots}
                  days={gridDays}
                  isLoading={isLoading}
                  selectedIso={selectedIso}
                  onSelectDay={setSelectedIso}
                />
              </RevealOnce>

              {/* Footer legend + totals */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                <div className="flex items-center gap-4">
                  {[
                    { label: "Open", c: "var(--brc-primary)" },
                    { label: "Partially booked", c: "var(--brc-warning)" },
                    { label: "Full", c: "var(--brc-success)" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-sm" style={{ background: l.c }} />
                      {l.label}
                    </span>
                  ))}
                </div>
                <span className="font-semibold">
                  {kpis.total} total slots · {kpis.open} open · {kpis.partial} partial · {kpis.full} full · {kpis.bookings} bookings
                </span>
              </div>

              {/* Stacked day panel on tablet/mobile (the sidebar one is xl+) */}
              <div className="xl:hidden">
                <DayPanel
                  iso={selectedIso}
                  daySlots={selectedDaySlots}
                  onViewDay={() => setSheetDate(selectedIso)}
                />
              </div>
            </>
          ) : (
            <RevealOnce>
              <CentersPanel onAddSlots={openAddSlotsForCenter} />
            </RevealOnce>
          )}
        </main>

        {/* Right day panel (desktop only) */}
        {section === "schedule" && (
          <aside className="hidden xl:sticky xl:top-[92px] xl:block xl:self-start">
            <DayPanel
              iso={selectedIso}
              daySlots={selectedDaySlots}
              onViewDay={() => setSheetDate(selectedIso)}
            />
          </aside>
        )}
      </div>

      <CreateSlotsModal
        open={slotsModalOpen}
        onClose={() => setSlotsModalOpen(false)}
        lockedCenter={lockedCenter}
      />
      <DayActivitySheet date={sheetDate} onClose={() => setSheetDate(null)} />
    </div>
  );
}
