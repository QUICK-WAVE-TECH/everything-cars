import { StatCard } from "@/shared/components";
import { OWNER_STATS } from "../data";

/** The 4-card owner summary strip used on the owner dashboard and request pages. */
export function OwnerStats() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: "clamp(14px, 2vw, 20px)",
      }}
    >
      {OWNER_STATS.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
