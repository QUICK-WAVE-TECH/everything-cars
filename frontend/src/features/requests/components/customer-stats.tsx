import { StatCard } from "@/shared/components";
import { CUSTOMER_STATS } from "../data";

/** The 4-card customer summary strip used on the dashboard and request pages. */
export function CustomerStats() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: "clamp(14px, 2vw, 20px)",
      }}
    >
      {CUSTOMER_STATS.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
