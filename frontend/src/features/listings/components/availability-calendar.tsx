"use client";

import { useState } from "react";
import { Icon } from "@/features/auth/components/icon";
import type { BookedPeriod } from "../api/types";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Monday … 6 = Sunday (ISO week) */
function firstDayOfWeekISO(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay(); // 0=Sun
  return (day + 6) % 7; // shift so Mon=0
}

function toISODate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isBooked(dateStr: string, periods: BookedPeriod[]): boolean {
  return periods.some((p) => dateStr >= p.start_date && dateStr < p.end_date);
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return (
    now.getFullYear() === year &&
    now.getMonth() === month &&
    now.getDate() === day
  );
}

function isPast(year: number, month: number, day: number): boolean {
  const now = new Date();
  const nowDate = toISODate(now.getFullYear(), now.getMonth(), now.getDate());
  const cellDate = toISODate(year, month, day);
  return cellDate < nowDate;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------------------------------------------------------------------------
// Single month grid
// ---------------------------------------------------------------------------

function MonthGrid({
  year,
  month,
  bookedPeriods,
}: {
  year: number;
  month: number;
  bookedPeriods: BookedPeriod[];
}) {
  const totalDays = daysInMonth(year, month);
  const firstOffset = firstDayOfWeekISO(year, month);

  // Build cell array: null = empty pad, number = day
  const cells: (number | null)[] = [
    ...Array<null>(firstOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ minWidth: 0 }}>
      {/* Month heading */}
      <p
        style={{
          fontFamily: "var(--brc-font-ui)",
          fontWeight: 700,
          fontSize: 14,
          color: "var(--brc-text)",
          margin: "0 0 12px",
          textAlign: "center",
        }}
      >
        {MONTH_NAMES[month]} {year}
      </p>

      {/* Day-of-week header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontFamily: "var(--brc-font-ui)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--brc-text-muted)",
              padding: "2px 0",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`pad-${idx}`} />;
          }
          const dateStr = toISODate(year, month, day);
          const booked = isBooked(dateStr, bookedPeriods);
          const past = isPast(year, month, day);
          const today = isToday(year, month, day);

          let bg = "#fff";
          let color = "var(--brc-text)";
          let opacity = 1;

          if (booked) {
            bg = "var(--brc-danger-bg, #fff1f1)";
            color = "var(--brc-danger, #c0392b)";
          } else if (past) {
            bg = "var(--brc-bg-subtle, #f5f5f5)";
            color = "var(--brc-text-muted)";
            opacity = 0.7;
          }

          return (
            <div
              key={day}
              title={booked ? "Booked" : past ? "Past" : "Available"}
              style={{
                height: 34,
                borderRadius: "var(--brc-radius-sm, 6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--brc-font-ui)",
                fontSize: 13,
                fontWeight: today ? 800 : 500,
                background: bg,
                color: color,
                opacity: opacity,
                outline: today ? "2px solid var(--brc-primary)" : undefined,
                outlineOffset: today ? -2 : undefined,
                cursor: "default",
                transition: "background 0.1s",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type AvailabilityCalendarProps = {
  bookedPeriods: BookedPeriod[];
};

export function AvailabilityCalendar({ bookedPeriods }: AvailabilityCalendarProps) {
  const now = new Date();
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth());

  // Second month
  const secondMonth = startMonth === 11 ? 0 : startMonth + 1;
  const secondYear = startMonth === 11 ? startYear + 1 : startYear;

  function goBack() {
    if (startMonth === 0) {
      setStartMonth(11);
      setStartYear((y) => y - 1);
    } else {
      setStartMonth((m) => m - 1);
    }
  }

  function goForward() {
    if (startMonth === 11) {
      setStartMonth(0);
      setStartYear((y) => y + 1);
    } else {
      setStartMonth((m) => m + 1);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--brc-border)",
        borderRadius: "var(--brc-radius-md, 12px)",
        padding: "20px 20px 16px",
        background: "#fff",
        fontFamily: "var(--brc-font-ui)",
      }}
    >
      {/* Navigation row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <button
          onClick={goBack}
          aria-label="Previous month"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--brc-radius-sm, 6px)",
            border: "1px solid var(--brc-border)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="chevleft" size={16} stroke="var(--brc-text)" />
        </button>

        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--brc-text-secondary)",
          }}
        >
          {MONTH_NAMES[startMonth]} {startYear} – {MONTH_NAMES[secondMonth]} {secondYear}
        </span>

        <button
          onClick={goForward}
          aria-label="Next month"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--brc-radius-sm, 6px)",
            border: "1px solid var(--brc-border)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="chevright" size={16} stroke="var(--brc-text)" />
        </button>
      </div>

      {/* Two-month grid */}
      <div className="avail-cal-grid">
        <MonthGrid year={startYear} month={startMonth} bookedPeriods={bookedPeriods} />
        <MonthGrid year={secondYear} month={secondMonth} bookedPeriods={bookedPeriods} />
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 16,
          paddingTop: 14,
          borderTop: "1px solid var(--brc-border)",
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Booked", color: "var(--brc-danger, #c0392b)", bg: "var(--brc-danger-bg, #fff1f1)" },
          { label: "Available", color: "var(--brc-success)", bg: "var(--brc-success-bg)" },
          { label: "Past", color: "var(--brc-text-muted)", bg: "var(--brc-bg-subtle, #f5f5f5)" },
        ].map(({ label, color, bg }) => (
          <span
            key={label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--brc-text-secondary)",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: bg,
                border: `1.5px solid ${color}`,
                flexShrink: 0,
              }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Responsive: stack to single column on mobile */}
      <style>{`
        .avail-cal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 600px) {
          .avail-cal-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
