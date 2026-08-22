# Sales Report — Design / build prompt (PR 2)

Visualize sales performance from transaction/deal data using **shadcn/ui charts**
(Recharts: `ChartContainer` + `ChartConfig` + `ChartTooltip`/`ChartTooltipContent`).
Interactive, responsive, theme-aware, styled with `--brc-*` tokens (no raw hex).
Load the `dataviz` skill before writing chart code. Pull blocks via the shadcn
MCP (already wired: root `.mcp.json`).

Audiences (same components): **owner/fleet** (scoped to their cars/branches) and
**admin** (platform-wide).

## Backend — aggregation endpoint

```
GET /api/v1/reports/sales?from=&to=&type=all|buy|rent&branch=<id>
```
Sales = **completed** `Transaction`s of type `purchase` + `rental` (+ `inspection`
where relevant), each linked to a car (via `request.car` / `inspection_booking.car`)
with its tracking ID, branch, owner. Returns:
- `kpis`: `{ revenue, units_sold, avg_sale_price, rentals_count, conversion_rate, deltas:{…vs previous period} }`
- `revenue_series`: `[{ date, purchases, rentals }]`
- `by_month`: `[{ month, units, revenue }]`
- `revenue_mix`: `[{ category, value }]` (Purchases / Rentals / Inspection)
- `top_models`: `[{ label, revenue }]` (top 6–8)
- `avg_price_series`: `[{ date, avg_sale_price, avg_rent_per_day }]`
- `by_branch`: `[{ branch, revenue, units }]` (fleet only)

All amounts NGN (₦), thousands-separated.

## Page layout

0. **Global filters** (drive every chart): date-range Select (7d/30d/3m/12m/custom),
   listing-type segmented (All/Buy/Rent), branch selector (fleet/admin). One
   `useSalesReport(params)` hook feeds everything.
1. **KPI row** (4 `StatCard`s): Total Revenue · Units Sold · Avg Sale Price ·
   Conversion. Each with a delta vs previous period + optional mini sparkline.

## Charts → verified shadcn blocks

| Section | Block | Interactivity |
|---|---|---|
| **Hero — revenue over time** (Purchases vs Rentals) | `chart-area-interactive` | built-in time-range Select; stacked gradient areas; tooltip |
| **Monthly volume ↔ revenue** | `chart-bar-interactive` | header KPI buttons toggle active series |
| **Revenue mix** | `chart-pie-donut-text` | total in center label (`chart-pie-interactive` for clickable slices) |
| **Top models by revenue** | `chart-bar-horizontal` + `chart-bar-label-custom` | sorted bars w/ value labels |
| **Avg price trend** | `chart-line-interactive` | multi-series, shares date range |
| **Branch performance** (fleet) | `chart-bar-multiple` (opt. `chart-radar-default`) | grouped bars |
| **Goal gauge** (optional) | `chart-radial-text` (opt. `chart-radial-stacked`) | % of target, number in center |
| **Tooltips** (all) | pattern from `chart-tooltip-formatter` | ₦ formatting in `ChartTooltipContent` |

Install:
```
cd frontend && npx shadcn@latest add @shadcn/chart-area-interactive \
  @shadcn/chart-bar-interactive @shadcn/chart-line-interactive \
  @shadcn/chart-pie-donut-text @shadcn/chart-bar-horizontal \
  @shadcn/chart-bar-label-custom @shadcn/chart-bar-multiple \
  @shadcn/chart-radial-text @shadcn/chart-radar-default @shadcn/chart-tooltip-formatter
```
Layout scaffold reference: the `dashboard-01` block.

## Primitives & quality
- Typed `ChartConfig` mapping `--chart-1…5` onto `--brc-*` (light + dark).
- `ChartTooltip`/`ChartTooltipContent`, `ChartLegend`/`ChartLegendContent`; wide
  charts in `overflow-x-auto`, `min-w-0`, responsive.
- Tokens only; follow `dataviz` categorical-color rules (color-blind safe,
  dark-mode contrast). Empty/loading(skeleton)/error states per card & chart.
- Responsive (KPI row 2×2 on mobile; charts stack); accessible title +
  data-table fallback for the hero chart.

## Build order
1. `/reports/sales` aggregation (owner-scoped + admin) + tests.
2. `useSalesReport` hook + types.
3. KPI row + global filters.
4. Hero (A) → B → C → D → E; F/G last (feature-flag if data/targets absent).
5. Wire tracking-ID → transactions drill-down (from PR 1).

Must-haves: KPI row + hero (A). Optional/fleet-only: F (branch), G (gauge).
