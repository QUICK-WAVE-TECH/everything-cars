# Buy & Rent Cars — Design System

A design system for **Buy & Rent Cars**, a Nigerian online marketplace where everyday users **rent, buy, and sell** cars. The platform connects customers with verified car owners and dealers, and layers on a loyalty-rewards program. Product surfaces include a public marketing site and a logged-in customer/owner dashboard (requests, transactions, listings, profile).

## Sources
- **Figma:** "Buy & Sell Cars.fig" (mounted). Pages: `Design` (37 product frames — landing, dashboards, sign-in/up, requests, transactions, payment, loyalty, about/contact) and `Design-System` (Style Sheet + component sheets). This system was built by reading that file's component JSX and variables directly; token/spacing/type values are transcribed verbatim from the source.
- No live codebase was provided.

> **The source ships a real logo** (`assets/logo.png`) — a royal-blue italic "Buy & Rent Cars" wordmark with an orange car-silhouette swoosh. Use it as-is; do not redraw it.

---

## Content fundamentals
How Buy & Rent Cars writes copy:
- **Voice:** warm, plain, reassuring — sells trust and ease. Headlines make a promise ("We Make Car Ownership and Rentals Effortless"; "Find the Perfect Car for Every Journey").
- **Person:** addresses the user as **you** ("Here's what's happening with your requests", "Turn your points into discounts"). Product refers to itself by name ("Buy & Rent Cars is a trusted platform…").
- **Casing:** Title Case for headings and button labels ("Rent Now", "See More", "Join the Program", "Browse Cars"). Sentence case for body and helper text.
- **Currency & locale:** prices in Naira with the ₦ glyph and thousands separators (₦35,000/day, ₦16,000,000). Locations are Nigerian ("Lagos, Nigeria"). Rentals show a `/day` suffix; purchases show a bare price.
- **Micro-labels:** short, functional — "Total Requests", "Pending", "Approved by Owner", "Waiting for owner approval", "Proceed to payment".
- **Section eyebrows:** small pill badges above section headings ("About Us", "Our Services", "Testimonials", "FAQs") with a tiny leading icon.
- **Emoji:** none. Iconography carries all visual accent.
- **Tone examples:** greeting is personal and time-aware ("Good Evening, Daniel"); testimonials are first-person and concrete.

## Visual foundations
- **Colour:** a two-accent brand — **deep navy `rgb(0,0,139)`** for primary CTAs, links and selected states, and **orange `rgb(255,149,0)`** for ratings, highlights and the loyalty program (which uses a deeper `rgb(195,101,35)` banner). The wordmark itself is a brighter royal blue. Neutrals run from near-black text `rgb(18,18,18)` through greys to a `rgb(250,250,250)` muted surface. Semantic colours: green success `rgb(32,184,88)`, amber warning `rgb(255,192,1)`, red danger `rgb(239,18,18)`, each with a pale tinted background for status pills.
- **Type:** **Manrope** is the workhorse (body, UI, prices, most headings — Regular 400 & Bold 700). **Lexend** carries big display headings (ExtraBold 800 / Black 900, e.g. the dashboard greeting and hero). **Geist** appears on small status-badge labels; **Archivo** on some button labels. Scale (verbatim): 64 / 48 / 32 / 24 / 16 / 14 / 12 px. Line-heights: 1.0 display, 1.2 headings/prices, 1.4 UI, 1.5 body.
- **Spacing & radii:** 4/8/12/16/24/32/40/64 spacing; radii **8** (primary buttons), **16** (cards & secondary buttons), **24–40** (large feature cards/banners), **100** (pills, badges, avatars), **4** (tiny chips). Values are exact — not snapped to an 8-px grid.
- **Cards:** white surface, 1px `rgb(232,233,233)` border, radius 16; car cards put the vehicle photo on a `rgb(250,250,250)` rounded panel with a white star-rating pill over the top-left corner, then a bordered info block with title, body-type chip, location, price and a dark "Rent/Buy Now" button.
- **Backgrounds:** mostly flat white and `rgb(250,250,250)`; the testimonials block is a dark `rgb(18,18,18)` card with a faint perspective **grid** motif; the loyalty banner is solid deep-orange. No photographic hero background, no gradients elsewhere.
- **Signature motif:** a **road-dash divider** (dashed line evoking lane markings) separates the listing rows on the landing page.
- **Elevation:** soft, low shadows built on `rgba(0,0,0,0.1)`; cards mostly rely on the 1px border rather than shadow.
- **States:** primary buttons darken navy on hover/press; disabled buttons use a pale navy tint `rgb(230,241,250)` with muted `rgb(151,152,154)` label. Selected filter chips / pagination fill navy with white text. Transitions are short (~.15s) colour fades — no bounces.
- **Borders:** stat cards use a **1px coloured border** matching the metric's semantic colour (navy total, amber pending, green approved, orange loyalty).
- **Imagery:** product photography is clean studio car shots (white cars on light backgrounds), warm-neutral, no heavy filters.

## Iconography
- **System:** **Phosphor Icons** — the source uses Phosphor glyph names verbatim (`ClockClockwise`, `CaretDown`, `MagnifyingGlass`, `MapPin`, etc.). This system loads Phosphor from CDN (`@phosphor-icons/web`, regular + fill + bold weights). Regular weight for UI, fill for badges/accents.
- **Usage:** line icons at 16–24px in UI; small filled dots inside status pills; caret-down on selects and nav; arrow-right on CTAs.
- **Social:** footer social chips (LinkedIn, Instagram, Facebook, X, WhatsApp) render as small navy-tint rounded squares — see `SocialIcon`, which maps to Phosphor brand glyphs.
- **No emoji, no unicode-as-icon.** Brand marks are the raster wordmark only.

---

## Components
Reusable primitives live under `components/<group>/` (`<Name>.jsx` + `.d.ts` + `.prompt.md`, one card HTML per group). Load via the compiled bundle: `const { Button } = window.BuyRentCarsDesignSystem_a58654`.

- **buttons/** — `Button` (primary / secondary / outline / ghost / accent; sizes lg/md/sm), `IconButton`.
- **cards/** — `CarCard` (marketplace listing card), `Card` (generic surface), `RequestCard` (rent/buy request row), `StatCard` (dashboard metric tile), `ContactCard` (contact detail tile).
- **badges/** — `StatusBadge` (pending / approved / rejected / none), `Tag` (category chip).
- **forms/** — `Input`, `Select`, `Checkbox`, `Radio`.
- **feedback/** — `StarRating`, `Accordion` (FAQ item), `Testimonial` (review card).
- **navigation/** — `Breadcrumbs`, `FilterChip`, `Pagination`, `NavLink`, `Navbar` (site header), `SiteFooter` (site footer).
- **brand/** — `Logo` (raster wordmark), `SocialIcon`.

### Coverage note (Figma families)
The source file reports ~79 "component families", but that count is inflated: the Figma has **duplicated pages** (most frames exist twice — e.g. `Contact-Us`/`Contact-Us2`), so families like `buttons`, `card`, `Breadchrumbs`, `Select` and the `Component 1…29` sets each appear 2–7 times, and many `Component N` entries are anonymous instance wrappers rather than distinct designs. The **21 primitives above consolidate every distinct, reusable family** in the file. Every generic `Component N` / `Frame …` / `Property 1=…` symbol was inspected and maps to one of these primitives: `Variant4` → `StatusBadge` (none), `Button Small` → `Button`, `CaretDown`/`Component 16` → `Select`, `Frame 1618869249` → `NavLink`, `Logged In`/`Logged Out` → Header (UI kit), `Component 11`/`24` → `RequestCard`, `faq`/`dedault` → `Accordion`, `Contact Us` → `ContactCard`. Compound families that are really page sections — `footer nav`, the header nav, testimonial blocks — are recreated inside the **UI kits**. Nothing distinct was intentionally omitted; the icon system ships as Phosphor (the file's own icon set).

### Intentional additions
- `IconButton`, `Pagination`, `FilterChip`, `Tag`, `NavLink` — small helpers the screens rely on that the file expresses only as ad-hoc instances; added for a complete primitive set.

### Families intentionally NOT built as primitives (and why)
The remaining ~58 "families" in the automated count are **not distinct reusable primitives** and are deliberately skipped:
- **Exact duplicates from cloned pages** — `Breadchrumbs`×4, `buttons`×3, `card`×7, `Select`×3, `Car Card`×3, `icons`×3, `Contact Us`×3, `Filter`×3, `Component 9/10/11/13/…`×2–3. The file duplicates whole pages (`X`/`X2`), so each set is counted many times; we built each once.
- **Anonymous instance wrappers** — `Component 1`–`Component 29`, `Frame …`, `Property 1=Frame 1618869249/2087325933/…`. Inspected: these are auto-named container instances of primitives we already ship (`Frame 1618869249`→`NavLink`, `Variant4`→`StatusBadge`, `Button Small`→`Button`, `Component 16`→`Select` caret).
- **Page-level composites, not primitives** — e.g. `Component 9` = the "Request rent_active" detail panel, `Component 11/24` = request rows (extracted as `RequestCard`), `footer nav` and the header nav = whole page sections. These are recreated inside the **UI kits** (marketing, dashboard, inspection-booking), which is where full screens belong, rather than as standalone components.

Nothing distinct was omitted; the 21 primitives are the complete set of the file's reusable building blocks.

## UI kits
- **`ui_kits/marketing/`** — the public landing page (hero + search, listing rows, testimonials, FAQ, loyalty, footer). Interactive: Sign Up toggles the logged-in header.
- **`ui_kits/dashboard/`** — the logged-in customer dashboard (greeting, stat cards, quick links, recent requests).
- **`ui_kits/inspection-booking/`** — 4-step vehicle-inspection booking modal (location → center → date/time → confirm), in the brand's light navy/orange house style.

## Foundations (Design System tab)
Specimen cards in `guidelines/` cover Colors (brand / neutrals / semantic), Type (display / body / scale / labels), and Spacing (scale / radii / elevation). Brand marks are in `components/brand/`.

---

## Root manifest / index
- `styles.css` — global entry (import this): fonts → colors → typography → spacing → figma tokens.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`.
- `components/` — primitives (grouped) + `fig-tokens.css`, `fig-typography.css` (materialized from Figma variables).
- `guidelines/` — foundation specimen cards.
- `ui_kits/marketing/`, `ui_kits/dashboard/` — full-screen recreations.
- `assets/` — `logo.png`, `car-lexus.png`, `icons/` (star, pin SVGs).
- `SKILL.md` — Agent-Skills manifest.

## Caveats
- **Fonts** (Manrope, Lexend, Geist, Archivo) are loaded from the **Google Fonts CDN**, not self-hosted. To ship offline, download the woff2 files into `assets/fonts/` and swap the `@import` in `tokens/fonts.css` for `@font-face` rules.
- **Icons** use the **Phosphor** CDN (the source's own icon system); the tiny SVGs copied into `assets/icons/` are the pin/star from the car card.
- Figma **Variables are sparse** (only ~10, mostly a partial colour/depth set); the real token system was reconstructed from observed usage values. `components/fig-tokens.css` preserves the raw materialized variables.
- The source Figma has no dark-mode product screens despite a "Dark" variable mode; this system is light-only.
