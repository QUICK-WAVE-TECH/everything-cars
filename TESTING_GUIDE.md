# EverythingCars — Full Manual Testing & Edge-Case Guide

A single QA reference for **everything shipped so far** (Specs 1–5, the Disputes
console, Spec A — Dealer branches, and Spec B — Team members & RBAC). Each
feature lists the **happy path** first, then the **edge cases** worth checking.
For a lighter per-spec smoke checklist, see `MANUAL_TESTING.md`; this file is the
exhaustive version.

> Legend: 🟢 happy path · 🟠 edge case · 🔴 must-not-happen (a bug if it does) ·
> ⏱ timing/async (hard to test live — trust the command/unit test)

---

## 0. Setup

```bash
# Backend
cd backend
uv sync
uv run python manage.py migrate        # also seeds the canonical brand list (Spec 4)
uv run python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

**Environment notes**
- Dev uses the **console/Mailpit email backend** — "emails" (verification codes,
  notifications) print to the `runserver` terminal.
- If a server was running when you switched branches, **restart it** (Django's
  autoreloader can get stuck mid-branch-switch).
- Tests: `cd backend && uv run pytest -q` (uses `--nomigrations`) and
  `uv run ruff check .`; frontend `npx tsc --noEmit && npm run lint && npm run build`.

### Accounts you'll want (create via sign-up or Django admin)

| Account | How | Used for |
|---|---|---|
| **Customer** | sign up as customer | offers, bookings, disputes |
| **Individual owner** | sign up as owner, `owner_type=individual`, verify in admin | basic listing/deals |
| **Fleet owner** | sign up as owner, `owner_type=fleet`, set `fleet_name`, verify in admin | branches, team, dealer flows |
| **Second fleet owner** | as above, different business | **isolation** tests |
| **Team member** | created by a fleet owner via `/owner/team` | branch-scoped RBAC |
| **Staff** | any user, set `is_staff=true` in admin | `/admin/*` console, disputes, payments |

**Verification gate:** an owner is `is_verified=false` until staff approves them
(Django admin → Owner Profiles, or `/api/v1/users/admin/owners/{id}/verify`).
Most owner actions are blocked until verified — test both states.

---

## 1. Spec 1 — Listing & offer rule changes

🟢 **Happy path**
- As a customer, make an offer on a negotiable **buy** car — enter **any positive
  amount** (no min/max range fields).
- A buy car with an accepted offer in progress shows an **"Ongoing negotiations"**
  badge (not "Reserved").
- The public car detail shows the **seller's business/brand name**.
- On a car's features, the label is **"description"** (no "value").

🟠 **Edge cases**
- Make **2** offers on the same car → the **3rd is blocked** (cap is 2, not 3).
- Offer of **0 or negative** → rejected.
- Offer on a **non-negotiable** buy car → not allowed (no offer entry point).
- Offer on a car that is **already sold/archived** → rejected.
- 🔴 A private min/max range must **never** reappear on the offer form.

---

## 2. Spec 2 — Deal & contact reveal (peer-to-peer)

🟢 **Happy path**
- Owner **accepts** a buy offer → a **Deal** is created (not a paid request); a
  `DEAL_REACHED` notification fires.
- Both buyer and seller open `/deals/[id]` and see each other's
  **name / brand / phone / email** (animated "contacts unlocked" reveal).
- Seller **"Mark as sold"** → deal completes, car reads as **sold** / off market.
- Either party **cancels** ("Deal fell through") → car returns to market, **prior
  bidders are notified**.

🟠 **Edge cases**
- Open `/deals/[id]` as a **non-participant** → **404** (never reveal contacts).
- **Buyer** tries to "Mark as sold" → **403** (seller-only).
- Accept a **second** offer on the same car while a deal is active → blocked
  ("Another offer on this vehicle was already accepted").
- **Dispute** a completed deal as the buyer (false-completion report) → allowed;
  as the **seller** → 403.
- Cancel an **already-completed** or **already-cancelled** deal → rejected.
- ⏱ An un-completed deal **auto-expires after 7 days** — trust `expire_deals` +
  unit tests.
- 🔴 A cancelled deal must free the car (it returns to browse) and must not leave
  the car stuck "reserved".

### Deal disputes console (`/admin/disputes`, staff)

🟢 **Happy path**
- Staff nav has a **"Disputes"** link + staff avatar. `/admin/disputes` lists open
  disputes with filter tabs (Open / Upheld / Dismissed / All) + search.
- **Uphold & reverse** → deal cancelled, **car relisted**, both parties + prior
  bidders notified.
- **Dismiss** (note ≥ 15 chars) → sale stands, buyer notified.

🟠 **Edge cases**
- Dismiss with a **< 15-char** note → rejected.
- **Non-staff** hitting `/admin/disputes` or the staff endpoints → 403/redirect.
- Uphold a dispute whose deal was **already reversed** → no double-reversal.
- Loading shows **skeletons**; an empty Open tab shows the "all caught up" state.
- **Relisted after uphold:** the reversed sale becomes `CANCELLED`, so the buyer
  **loses** VIN-relist rights (see Spec 5 resale-chain).

---

## 3. Spec 3 — Pay-to-book inspection

**Setup first:** Django admin → **Fee Settings** → set `inspection_fee`,
`listing_fee`, `vat_rate`, and platform **bank details** (else the summary shows
₦0 / no bank info).

🟢 **Happy path**
- Owner books an inspection for an approved car → booking step shows the
  **fee breakdown** (inspection + listing + VAT + total) + **bank details** +
  **receipt upload**.
- **Book** stays disabled until a **receipt is attached**; submit →
  "Payment submitted — we'll confirm shortly," car shows **"Verifying payment."**
- Staff → `/admin/payments` → **Inspection payments** card lists it → drawer shows
  fee summary + **View receipt** + **Confirm / Reject**.
- **Confirm** → booking active (owner emailed appointment details); inspect form
  usable. Fee lands in **Transactions** as type **"Inspection fee."**
- **Reject** (reason) → booking cancelled, car relisted, owner notified.

🟠 **Edge cases**
- Open the inspect page for an **unverified** booking → **"Payment pending
  verification"** notice (form blocked) + link to the Payments desk.
- Submit booking **without a receipt** (bypassing the UI) → 400.
- **Confirm/Reject** the same payment **twice** → idempotent / already-resolved.
- The **payment notification** deep-links staff to `/admin/payments` (not
  approvals).
- Transactions **type filter** includes "Inspection fee"; the **owner** sees fees
  they paid; **pagination** works on a long list.
- 🔴 The fee is **non-refundable** — rejecting a payment cancels the booking but
  the ledger entry semantics must stay consistent (no negative/void surprises).

---

## 4. Spec 4 — Canonical brand list

🟢 **Happy path**
- After `migrate`, admin → **Listings › Brands** shows **~221** brands
  (Toyota, Mercedes-Benz, Innoson… popular first). Or `GET /api/v1/listings/cars/brands`.
- New listing: **Brand** is a **searchable dropdown** (type `toy` → Toyota). Model
  stays free text.
- Pick **"Other (not listed)"** → text input appears; submit an off-list brand →
  car created **flagged** (`brand_other` set, `brand` blank).
- Buyer browse → **Brand filter** lists canonical, deduped brands.

🟠 **Edge cases**
- Aliases resolve:
  ```bash
  cd backend && uv run python manage.py shell -c "from apps.listings.brands_data import match_brand; print(match_brand('benz'), match_brand('vw'), match_brand('range rover'), match_brand('toyata'))"
  # → Mercedes-Benz Volkswagen Land Rover Toyota
  ```
- Edit a car in "Changes requested" → same brand picker; an "Other" car pre-fills
  its typed value.
- Staff **add a brand** in admin → appears in the picker; correct a flagged car by
  setting `brand` + clearing `brand_other`.
- Existing pre-feature cars were **auto-canonicalized** ("Nissan Ultima" → Nissan).
- 🔴 No "Benz" vs "Mercedes-Benz" duplicates in the filter.

---

## 5. Spec 5 — VIN transfer & relist a sold VIN

**Setup:** a **completed** buy deal (owner lists buy car → customer offers → owner
accepts → seller "Mark as sold" → car archived). The **buyer must be a verified
owner** to relist.

🟢 **Happy path**
- Buyer of a completed deal opens `/deals/[id]` → **"Relist this vehicle"** button
  (buyer-only, completed-only) → Add-car form opens **VIN prefilled**
  (`/owner/my-cars/new?vin=…`) → save with same VIN. Old sold car stays archived.

🟠 **Edge cases**
- A **different owner** entering that VIN → rejected: *"You can only relist a
  vehicle you bought through the platform."*
- A VIN on a **live (non-archived)** listing → rejected: *"already registered."*
- VIN wrong length / bad chars (I/O/Q) → validation error.
- **Resale chain:** buyer relists, sells to a new buyer → only the **newest** buyer
  can relist next; the previous owner is blocked.
- **Dispute interaction:** if the completed sale is **within its dispute window**,
  relist is blocked until the transfer is finalized (`completed_deal_is_final`).
- 🔴 A dispute **upheld** (sale reversed → CANCELLED) means the would-be buyer
  **loses** relist rights.

---

## 6. Spec A — Dealer branches

**Setup:** a **verified fleet** owner (owner_type=fleet, `fleet_name` set).
Individual owners are unaffected by everything here.

🟢 **Happy path**
- Fleet owner's dashboard shows a **"Branches"** tile → `/owner/branches`.
- **Zero branches** → onboarding empty state ("Set up your first branch") with the
  business name shown as parent.
- **Add branch** dialog: **read-only business name** (lock icon), Branch name,
  State (searchable), City, Street address, Phone, Email — all required. Save →
  toast, card appears (address, phone, email, green **Active**).
- **Edit** (business name stays read-only). **Retire** (confirm) → card dims +
  "Retired" badge; menu → **Reactivate**.

🟠 **Edge cases**
- A verified fleet owner with **no branch** who tries to **list a car** is
  **redirected** to `/owner/branches`; the backend car-create also **400s**.
- **Duplicate branch name** within the same business → 400 ("already have a
  branch with this name"). Two *different* businesses **can** both have an "HQ".
- **Bad email** in the dialog → inline error.
- **Cross-business:** business B cannot see/edit business A's branch → **404**.
- **Individual owner** visiting `/owner/branches` → "branches are for business
  accounts" notice (no crash); customer → redirected.
- Writing `business_name` in a PATCH payload is **ignored** (immutable per branch).
- Loading shows **skeleton** cards.
- 🔴 Retiring a branch must never hard-delete it (soft `is_active=false` only).

---

## 7. Spec B — Team members & branch-scoped RBAC

**Setup:** a verified fleet owner **with ≥1 branch**. Create members via
`/owner/team`; they sign in **passwordless** (email → code). Have a **second fleet
owner** ready for isolation tests.

### 7.1 Team management (owner)

🟢 **Happy path**
- Dashboard shows a **"Team"** tile → `/owner/team`.
- Empty state ("Build your team") → **Add member**: email + first/last name +
  optional title + **branch multi-select** (≥1). Save → toast "Member added",
  card shows avatar, name, title, email, **branch chips**, Active.
- **Edit** → email read-only; change title + reassign branches. **Deactivate**
  (confirm) → dims + "Disabled"; **Reactivate**.

🟠 **Edge cases**
- **Duplicate email** (already a user) → 400 "This email is already registered."
- **No branch** selected → 400 / inline error.
- **Cross-business branch** in `branch_ids` → 400 ("aren't yours").
- **Team member** hitting `/owner/team` or any `/owner/team/…` → **403**.
- **Individual owner** on `/owner/team` → "for business accounts" notice.
- **Cross-business:** owner B requesting owner A's member id → **404**.
- Member account is created **active + passwordless** (a random unusable password);
  they sign in via the normal code flow. Verify the "you've been added" mail
  prints to the terminal.

### 7.2 Branch attribution on listing

🟢 **Happy path**
- On `/owner/my-cars/new`, fleet listers (owner **and** team member) see a
  **required Branch** select. Owner → all active branches; **team member → only
  assigned** branches. Individual owners never see it.
- Listing saves with the branch; **`Car.owner` is the business owner** (even when a
  team member creates it), `Car.branch` is the chosen branch.

🟠 **Edge cases**
- Submit **without** a branch (fleet lister) → inline "Select the branch…" +
  backend 400.
- Team member submits a **branch they aren't assigned to** (tampered request) →
  400 ("You aren't assigned to that branch").
- A branch from **another business** → 400 ("isn't part of your business").
- Team member with **zero assigned branches** on the list-car page → notice "ask
  your business owner" (no redirect — they can't self-serve).

### 7.3 Branch-scoped data (team member)

🟢 **Happy path**
- Sign in as the team member → dashboard shows **"Viewing: {branch chips}"** and
  only **My Cars / Offers / Deals** tiles (no Branches/Team/Transactions).
- My Cars lists **only** their assigned-branch cars. Offers/Deals likewise.
- They can **respond to / accept** an offer on their branch, and
  **complete/cancel** a deal on their branch (recorded as the seller side).

🟠 **Edge cases (the important ones)**
- Directly opening a **car / offer / deal in an unassigned branch** (guess the URL)
  → **404** (scoped queryset — the row simply doesn't exist for them).
- Team member visiting `/owner/branches`, `/owner/team`, `/owner/transactions` →
  **redirected** to their dashboard (owner-only).
- **Owner sees all** branches' cars/offers/deals (branch_ids = all).
- **Deactivated membership:** deactivate a member → they can no longer see any
  branch data (resolver returns no access → 403/empty); reactivate restores it.
- **Retire a branch** that a member is assigned to → the branch is **removed from
  every member's assignments**; a member left with **zero** branches sees an empty
  dashboard / the "ask your owner" notice — **not a 500**.
- **Reassign branches** live (owner edits the member) → the member's visible
  inventory/offers change accordingly on next load.
- 🔴 A team member must **never** see or act on another branch's data, another
  business's data, or owner-only pages (transactions, branch/team management).

### 7.4 Public listing (inherited contact)

🟢 A dealer car's **public detail** page shows the **branch's location + inherited
phone/email**. Individual-owner cars show no branch block.

---

## 7.5 Spec C — Two-stage inspect→publish + staff roles

**Setup:** in Django admin set staff `staff_role` — one `inspector`, one
`publisher` (existing staff auto-become `admin` = both). Get a car to a **Passed**
inspection (owner books + pays → inspector starts + submits Passed).

🟢 **Happy path**
- Inspector submits **Passed** → car → **Pending Publishing** (not live); owner told it passed.
- Publisher opens `/admin/publishing` → paginated **oldest-first** queue with a "N waiting" count + search.
- **Review** → drawer shows listing + inspection report + **inspector's notes**.
- **Publish live** → car `PUBLISHED`, appears in public browse, owner notified.
- **Send back** (note ≥ 15) → car `NEEDS_CHANGES`, owner notified.

🟠 **Edge cases**
- Send-back note **< 15 chars** → 400 / inline error.
- **Publish a car not in the queue** (already published / wrong state) → 404.
- **Inspector** on the publishing queue/publish/send-back APIs → **403**; the
  `/admin/publishing` page shows a "Publishers only" notice; the nav **Publishing**
  link is hidden for inspectors.
- **Publisher** on inspection start/submit → **403** (that's the inspector's stage).
- **Admin** (existing staff) can do **both** stages.
- **Direct publish:** in the admin car-status console, only publisher/admin may push a car to `Published`.
- 🔴 A car in **Pending Publishing** must **never** appear in public browse (only `PUBLISHED` is live).
- 🔴 Existing staff must not lose access after the migration (they're backfilled to `admin`).

---

## 7.6 Spec D — Offer negotiation fallback

**Setup:** a buy car with two+ customers who each offer.

🟢 **Happy path**
- Accept Buyer A → Buyer B's offer → **`standby`** ("On standby"), B notified.
- Cancel the deal → B's offer (and A's) **revive to `pending`** with a **fresh 48h**
  expiry + `revived_at` set; owner sees a **"Re-opened"** badge; prior bidders emailed.
- Owner **accepts B directly** (no re-submission) → new Deal; a third standby offer
  goes back to `standby`.
- Complete a deal instead → standby offers → **`superseded`** (terminal).

🟠 **Edge cases**
- **Reverse** (dispute upheld) revives standby offers the same as cancel.
- A **standby** offer is **not** auto-expired by `expire_offers` (it filters active
  statuses only); on revival it gets a fresh window.
- The previously-**accepted** offer is also released on cancel/reverse — it no longer
  blocks the seller from accepting a fallback ("another offer already accepted").
- The per-customer **offer cap** is unaffected (a revived offer is the same offer).
- Buyer view: a `standby` offer reads "On standby" with an explanation, **not** "declined."
- 🔴 On **completion**, standby offers must become terminal (`superseded`) — never revived.

---

## 8. Cross-cutting edge cases (worth a pass across the whole app)

**Auth & sessions**
- 🟠 Access token expiry → the client transparently refreshes once via
  `/auth/refresh` and retries; a revoked/blacklisted refresh token → forced sign-in.
- 🟠 Signed-out user hitting any `/owner/*`, `/customer/*`, `/admin/*` → redirected
  to `/sign-in`.
- 🟠 Wrong-role access (customer → `/owner`, owner → `/customer`, non-staff →
  `/admin`) → redirected to the correct dashboard.

**Permissions / roles**
- 🔴 Every owner-only endpoint returns **403** for customers and team members;
  every staff endpoint returns **403** for non-staff.
- 🟠 A `team_member` is allowed on shared `/owner` routes (dashboard, my-cars,
  offers, deals) but **blocked** from branch/team/transaction management.

**Data isolation (multi-tenant)**
- 🔴 Business A can never read/modify business B's branches, team, cars, offers, or
  deals — verify with two fleet owners side by side.

**Concurrency / double-submit**
- 🟠 Double-clicking **Accept offer**, **Mark as sold**, **Confirm payment**, or
  **Book** must not create duplicates (idempotent / single-active constraints).
- 🟠 Two customers' offers accepted near-simultaneously → only **one** deal wins;
  the other accept fails cleanly.

**Notifications & email (console backend)**
- 🟠 Each lifecycle event (offer received, deal reached/completed/cancelled,
  car available again, payment submitted/confirmed/rejected, listing approved /
  changes requested, team-member added) prints an email to the terminal and/or
  rings the in-app bell.

**Validation & money**
- 🟠 Prices/amounts reject non-numeric, negative, and absurd values; currency is
  consistent per car.
- 🟠 File uploads (ID docs, receipts, car photos) reject wrong types and oversize
  (> 5 MB for car images).

**Migrations & fresh clone**
- 🟢 A fresh clone runs **`migrate`** clean (brands seed via migration; no Branch
  table collision) and boots. `makemigrations --check --dry-run` → "No changes
  detected."

**Regression sweep before release**
```bash
cd backend && uv run pytest -q && uv run ruff check .          # 415+ pass, lint clean
cd frontend && npx tsc --noEmit && npm run lint && npm run build   # all clean
```

---

## 9. Spec status

| Spec | Feature | Status |
|---|---|---|
| 1 | Listing & offer rule changes | ✅ `main` |
| 2 | Deal & contact reveal + disputes console | ✅ `main` |
| 3 | Pay-to-book inspection | ✅ `main` |
| 4 | Canonical brand list | ✅ `main` |
| 5 | VIN transfer & relist | ✅ `main` |
| A | Dealer branches | ✅ `main` |
| B | Team members & branch-scoped RBAC (+ Car→Branch) | ✅ `main` |
| C | Two-stage inspect→publish + Inspector/Publisher roles | 🚧 on `feat/spec8-inspect-publish` |
| D | Offer negotiation fallback (persistent counter-offers) | 🚧 on `feat/spec9-offer-fallback` |
