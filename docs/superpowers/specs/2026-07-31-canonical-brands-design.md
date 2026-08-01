# Spec 4 — Canonical Brand List (Design)

**Date:** 2026-07-31
**Status:** Approved — ready for implementation plan

## Goal

Replace the free-text `Car.brand` field with a **canonical brand list** so listings use consistent brand values and buyer-facing filtering/search is clean. Today `brand` and `model` are free-text `CharField`s, producing duplicates and typos ("Mercedes" / "Mercedes-Benz" / "Benz") that fragment filters and facets.

## Scope (decided)

| Question | Decision |
|---|---|
| How far to canonicalize | **Brand canonical; model stays free-text** (optional type-ahead). Models are thousands and messy — not worth constraining now. |
| Brand dataset | **Broad seeded world make-list** (~150–250 real makes), staff-manageable. |
| Unknown brand | **"Other" + type it, staff reviews.** The owner is never blocked; the listing is flagged for staff to fold into the canonical list. |
| Existing listings | **Auto-match + flag the rest.** A one-time migration normalizes (+ alias map) each existing brand to a canonical one; unmatched values move to `brand_other` (flagged). |
| Data-model shape | `Car.brand` stays a **validated canonical string** (not a ForeignKey). A `Brand` table is the source of truth for the picker, validation, and facets. |

**Already canonical / out of scope:** `body_type`, `transmission`, `fuel_type` are already enums; `year` is numeric; there is no `trim` field. `Car.model` stays free-text. VIN decode (Spec 5) can later map onto the same `Brand` table but is not built here.

**Why a validated string, not a ForeignKey:** the codebase filters/searches/serializes `brand` as a string throughout (`brand__icontains`, `distinct(Car.brand)`, search `Q(brand__icontains=…)`). Keeping `brand` a string — but always a canonical value — gives clean, consistent data with minimal churn. An FK would ripple through views, serializers, filter-options, and search for little benefit at this scale.

## Data model (`apps/listings/models.py`)

### New `Brand` model
- `id` — UUID pk.
- `name` — `CharField(max_length=100, unique=True)` — the canonical display name (e.g. "Mercedes-Benz").
- `slug` — `SlugField(unique=True)` — normalized key for matching (e.g. "mercedes-benz").
- `is_active` — `BooleanField(default=True)` — staff can hide a brand without deleting.
- `display_order` — `PositiveSmallIntegerField(default=1000)` — Nigeria-common brands get a low number so they sort to the top; ties break alphabetically.
- `created_at` — `auto_now_add`.
- `Meta.ordering = ["display_order", "name"]`.

### `Car` field changes
- `brand` — stays `CharField(max_length=100)`; now always holds a canonical `Brand.name` (blank when "Other").
- **New** `brand_other` — `CharField(max_length=100, blank=True, default="")` — the owner's typed value when they pick "Other". Non-empty ⇒ "needs staff review".
- `model` — unchanged (free-text).

`Car.needs_brand_review` (property): `bool(self.brand_other)`.

## Seeding & admin
- **`seed_brands` management command** loads a bundled Python list of ~150–250 makes (world majors + Nigeria-relevant, incl. local **Innoson / IVM**). Idempotent: `get_or_create` by slug; sets `display_order` low for a curated Nigeria-popular subset. Safe to re-run.
- `Brand` registered in Django admin (`list_display`: name, slug, is_active, display_order; editable is_active/display_order) so staff add/rename/hide/reorder.

## Listing create/edit validation (`CarCreateSerializer`)
Wire format: the request may send `brand` and/or `brand_other`. Rules:
1. **Other** — if `brand_other` is present and non-empty, it wins: store the trimmed typed value in `brand_other` and store `brand` blank. (The frontend sends `brand_other` only when the owner picks "Other".)
2. **Known brand** — else `brand` must match an **active `Brand.name`** (case-insensitive lookup); store the canonical `Brand.name` and clear `brand_other`.
3. **Neither / unrecognised** — a `brand` that isn't an active brand and no `brand_other` → `400` with a clear message.

This is the write-time guarantee against drift. Model stays free-text as today.

## "Other" staff reconciliation
Listings with `brand_other` set surface in the existing staff approval/inspection review with a small **"unrecognised brand"** flag (e.g. a badge + the typed value). Staff either:
- **Add it to the `Brand` table** (via admin) and set the car's `brand` to the new canonical name, clearing `brand_other`; or
- **Correct it** to an existing brand.

Either way the new brand becomes selectable for everyone going forward. (No new bespoke UI required beyond surfacing the flag — reconciliation is a Django-admin action / edit.)

## Migration of existing listings (data migration)
A one-time data migration:
1. Ensures brands are seeded (calls the same seed helper).
2. For each existing `Car`, normalizes `brand` (trim, collapse spaces, lowercase) and matches against `Brand.slug` **plus an alias map**: e.g. `benz`/`mercedes`/`mercedes benz` → Mercedes-Benz, `vw` → Volkswagen, `chevy` → Chevrolet, `range rover`/`landrover` → Land Rover, `merc` → Mercedes-Benz, `toyata`→Toyota (common typos as encountered).
3. **Match** → rewrite `brand` to the canonical `Brand.name`.
4. **No match** → move the raw value to `brand_other` and blank `brand` (flagged for staff).

Reversible-enough: the migration is forward-only on data; no schema data is lost (unmatched values preserved in `brand_other`).

## API (`apps/listings`)
- **`GET /listings/brands/`** — active brands ordered by `display_order, name`; returns `[{id, name, slug}]`. Public (buyers + owners use it). Cache-friendly.
- **Buyer filter-options** endpoint: the `"brands"` facet now reads from the **`Brand` table** (active brands) instead of `distinct(Car.brand)`, so facets are always canonical (optionally intersected with brands that actually have published cars).
- **Brand filter** on the car list: `?brand=` continues to work; now matches canonical names exactly (case-insensitive), no more partial-string collisions.
- *(Optional, YAGNI-able)* `GET /listings/models?brand=<name>` — distinct existing `model` values for type-ahead. Not required for v1.

## Frontend (`frontend/src`)
- **Listing form** (owner new/edit car): the Brand input becomes a **searchable Select** populated from `GET /listings/brands/`, with an **"Other"** option at the bottom that reveals a free-text input (bound to `brand_other`). Model stays a text input (type-ahead optional/deferred). Uses the existing shadcn Select/Command + `--brc-*` tokens.
- **Buyer browse filter**: the brand filter dropdown reads the canonical brand list (from `/listings/brands/` or filter-options), so buyers pick from clean, deduped brands.
- No visual redesign — reuse existing form field + filter components.

## Testing
- **Brand model / seed:** `seed_brands` is idempotent; seeds include Nigeria-relevant makes; a curated subset has low `display_order`.
- **Validation:** a listing with a known brand passes and stores the canonical name; junk brand is rejected `400`; `"Other"` + `brand_other` is accepted and stores the typed value with `brand` blank.
- **Migration:** given cars with `"benz"`, `"Mercedes Benz"`, `"toyota"`, `"Kiaa"` — the first three canonicalize, `"Kiaa"` lands in `brand_other` flagged.
- **API:** `/listings/brands/` returns active brands ordered correctly; filter-options `"brands"` facet is canonical; `?brand=Toyota` filters exactly.
- **Frontend:** build + lint; brand Select renders options and the "Other" path reveals the text field.

## Out of scope
- Canonicalizing **model** (free-text stays), **trim** (no field), year/body/transmission/fuel (already numeric/enum).
- VIN decode → brand mapping (Spec 5).
- Brand logos/images.
