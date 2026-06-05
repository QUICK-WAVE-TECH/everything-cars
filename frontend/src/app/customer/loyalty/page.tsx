import { Breadcrumb } from "@/shared/components";
import { Icon } from "@/features/auth/components/icon";

const CURRENT_POINTS = 0;
const NEXT_TIER_POINTS = 1000;
const CURRENT_TIER = "Bronze";

type EarnRule = { points: number; title: string; desc: string; circle: string; bg: string };

const EARN_RULES: EarnRule[] = [
  { points: 25, title: "Per Rental Day", desc: "Earn 25 points for every day you rent a car", circle: "var(--brc-primary)", bg: "var(--brc-primary-tint)" },
  { points: 50, title: "Referral Bonus", desc: "Get 50 points when a friend signs up and books", circle: "var(--brc-accent)", bg: "var(--brc-accent-bg)" },
  { points: 10, title: "Review Bonus", desc: "Earn 10 points for every review you leave", circle: "#9333EA", bg: "#F3E8FF" },
];

type Reward = { title: string; required: number };

const REWARDS: Reward[] = [
  { title: "5% discount on next rental", required: 100 },
  { title: "10% discount on next rental", required: 200 },
  { title: "15% discount on next rental", required: 300 },
  { title: "1 day free rental", required: 2000 },
  { title: "15% discount on next rental", required: 300 },
  { title: "1 day free rental", required: 2000 },
];

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--brc-border)",
  borderRadius: "var(--brc-radius-lg)",
  padding: "clamp(18px, 3vw, 28px)",
};

function EarnTile({ rule }: { rule: EarnRule }) {
  return (
    <div
      style={{
        background: rule.bg,
        borderRadius: "var(--brc-radius-md)",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: rule.circle,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--brc-font-display)",
          fontWeight: 800,
          fontSize: 20,
        }}
      >
        {rule.points}
      </span>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 16, color: "var(--brc-text)" }}>{rule.title}</span>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)", lineHeight: 1.5, maxWidth: 220 }}>{rule.desc}</span>
    </div>
  );
}

function RewardItem({ reward }: { reward: Reward }) {
  const progress = Math.min(100, (CURRENT_POINTS / reward.required) * 100);
  return (
    <div
      style={{
        border: "1px solid var(--brc-border)",
        borderRadius: "var(--brc-radius-md)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--brc-bg-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="gift" size={18} stroke="var(--brc-text-muted)" />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, color: "var(--brc-text)" }}>{reward.title}</span>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)" }}>
            {reward.required.toLocaleString("en-NG")} points required
          </span>
        </div>
      </div>
      <div style={{ height: 6, background: "var(--brc-bg-muted)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "var(--brc-accent)", borderRadius: 6 }} />
      </div>
    </div>
  );
}

export default function LoyaltyPage() {
  const progressToNextTier = Math.min(100, (CURRENT_POINTS / NEXT_TIER_POINTS) * 100);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/customer/dashboard" },
          { label: "Loyalty Reward Program" },
        ]}
      />
      <div style={{ background: "var(--brc-bg-subtle)" }}>
        <div
          style={{
            maxWidth: 1232,
            margin: "0 auto",
            width: "100%",
            padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: "clamp(28px, 6vw, 44px)", color: "var(--brc-text)", margin: 0 }}>
              Loyalty Reward Program
            </h1>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)", margin: 0 }}>
              Earn points on every booking and unlock exclusive benefits
            </p>
          </div>

          {/* Current points banner */}
          <section
            style={{
              borderRadius: "var(--brc-radius-lg)",
              background: "linear-gradient(120deg, var(--brc-accent), var(--brc-accent-deep))",
              color: "#fff",
              padding: "clamp(20px, 3vw, 28px)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 15, color: "rgba(255,255,255,.9)" }}>Current Point</span>
                <span style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: 40, lineHeight: 1 }}>{CURRENT_POINTS}</span>
              </div>
              <span
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="gift" size={24} stroke="#fff" />
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "var(--brc-font-ui)", fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>Current Tier: {CURRENT_TIER}</span>
                <span style={{ color: "rgba(255,255,255,.9)" }}>{NEXT_TIER_POINTS} points to next tier</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.3)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${progressToNextTier}%`, height: "100%", background: "#fff", borderRadius: 6 }} />
              </div>
              <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "rgba(255,255,255,.85)" }}>Keep earning to unlock more rewards!</span>
            </div>
          </section>

          {/* Earning rules */}
          <section style={cardStyle}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                gap: 20,
              }}
            >
              {EARN_RULES.map((rule) => (
                <EarnTile key={rule.title} rule={rule} />
              ))}
            </div>
          </section>

          {/* Available rewards */}
          <section style={cardStyle}>
            <h2 style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 20, color: "var(--brc-text)", margin: "0 0 20px" }}>
              Available Rewards
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                gap: 16,
              }}
            >
              {REWARDS.map((reward, i) => (
                <RewardItem key={`${reward.title}-${i}`} reward={reward} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
