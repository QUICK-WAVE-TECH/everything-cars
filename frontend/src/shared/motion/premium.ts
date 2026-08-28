/** Shared Motion tuning for the admin surfaces. Physics-based, overdamped
 * (ζ ≈ 2.1 for the spring below) so movement settles with no overshoot — the
 * restrained feel a financial/operational dashboard needs. */

/** Smoothing spring for scroll-linked parallax motion values. */
export const PREMIUM_SPRING = { stiffness: 120, damping: 28, mass: 0.35 } as const;

/** One-shot reveal tween — short, easeOut-ish, no bounce. */
export const PREMIUM_TWEEN = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as const,
} as const;

/** Everyday interaction transition (hover, filter open/close): 140–220ms. */
export const PREMIUM_INTERACTION = { duration: 0.18, ease: "easeOut" } as const;

/** Controlled spring for drawers / major section movement. */
export const PREMIUM_PANEL_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.9,
} as const;
