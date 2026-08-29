/** Live-sync indicator — a green dot that pulses while data is refetching in the
 * background, wired by the caller to React Query's `isFetching`. */
export function LiveSync({ active }: { active: boolean }) {
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

/** The console page header: eyebrow, big title, subtitle, an optional live dot,
 * and a right-aligned actions slot. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  live,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  live?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {eyebrow}
        </span>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-[clamp(26px,4vw,36px)] font-black leading-none tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
            {title}
          </h1>
          {live !== undefined && <LiveSync active={live} />}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-[14px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
