# EverythingCars — Manual Testing Guide

A per-spec checklist so anyone can smoke-test the features we've shipped on their
own machine. Tick items as you verify them.

## Getting set up

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

**Accounts you'll want** (create via sign-up, or reuse seeded/test users):

- an **owner** (lists cars),
- a **customer** (makes offers / books),
- a **staff** user (`is_staff = true` — set in Django admin) for the `/admin/`\* console.

**Notes**

- If a server was already running when you switched branches, **restart it**
  (Django's autoreloader can get stuck mid-branch-switch).
- Dev uses the console email backend — "emails" print to the `runserver` terminal.
- Status of each spec is noted in its header (merged to `main`, or on a branch).

---

## Spec 1 — Listing & offer rule changes · ✅ on `main`

**Goal:** Tidy up the listing/offer rules — drop the private price range (any
positive offer, no floor), lower the per-customer offer cap 3 → 2, rename the
"Reserved" badge, show the seller's brand publicly, and use `description` on
features.

**Manual checklist**

- [ ] As a **customer**, make an offer on a negotiable **buy** car — you can enter **any positive amount**; there are no min/max range fields.
- [ ] Keep making offers on the **same** car — you're blocked after **2** offers (the cap is 2, not 3).
- [ ] On a car's features, the label reads **"description"** (there is no "value" field).
- [ ] A buy car with an accepted offer in progress shows an **"Ongoing negotiations"** badge (not "Reserved").
- [ ] The **public car detail** page shows the **seller's business/brand name** (a fleet's name, otherwise the person's name).

---

## Spec 2 — Deal & contact reveal · ✅ on `main`

**Goal:** Replace the old office-inspection/escrow/commission model with a
**peer-to-peer contact reveal**: when a buy offer is accepted, both parties see
each other's contact and settle **off-platform** (no platform payment, no
commission).

**Manual checklist**

- [ ] As an **owner**, accept a buy **offer** → a **Deal** is created (not a paid request).
- [ ] Both **buyer** and **seller** can open `/deals/[id]` and see each other's **name / brand / phone / email** (animated "contacts unlocked" reveal).
- [ ] The **seller** can **"Mark as sold"** → deal completes and the car reads as **sold** / off the market.
- [ ] Either party can **cancel** ("Deal fell through") → the car returns to the market and **prior bidders are notified** (check the notification bell / email log).
- [ ] The **buyer** can **dispute** a completed deal they say never happened (report a false completion).
- [ ] Owner and customer both have a **"Deals"** entry in their dashboard/nav that lists their deals.
- [ ] _(Timing)_ An un-completed deal **auto-expires after 7 days** — hard to test live; trust the `expire_deals` command / unit tests.

---

## Deal disputes console · ✅ on `main` · _(Spec 2 follow-on)_

**Goal:** Give staff a place to resolve buyer disputes — uphold (reverse the deal
and relist the car) or dismiss (the sale stands).

**Manual checklist**

- [ ] As **staff**, the admin nav has a **"Disputes"** link and a **staff avatar** top-right.
- [ ] `/admin/disputes` lists open disputes with **filter tabs** (Open / Upheld / Dismissed / All) and **search**.
- [ ] Click a row → a **detail drawer** shows the car + agreed amount, **both parties' contacts**, a **case timeline**, and the buyer's reason.
- [ ] **Uphold & reverse** → the deal is cancelled, the **car is relisted**, and both parties + prior bidders are notified.
- [ ] **Dismiss** requires a **note (≥ 15 chars)** → the sale stands and the **buyer is notified** of the outcome.
- [ ] Loading shows skeletons; an empty Open tab shows the "all caught up" state.

_(To create a dispute to test: complete a deal as the seller, then dispute it as the buyer — see Spec 2.)_

---

## Spec 3 — Pay-to-book inspection · ✅ on `main`

**Goal:** The **owner** pays a one-time, non-refundable fee (inspection + listing

- VAT) up front to book a physical inspection; **staff verify the receipt on the
  Payments desk** before the inspection can start. Fees land in the transactions
  ledger.

**Setup first:** Django admin → **Fee Settings** → set `inspection_fee`,
`listing_fee`, `vat_rate`, and the platform **bank details** (otherwise the
summary shows ₦0 and no bank info).

**Manual checklist**

- [ ] As an **owner**, book an inspection for an approved car → the booking step shows a **fee breakdown** (inspection + listing + VAT + total) + **bank details** + a **receipt upload**.
- [ ] The **Book** button stays **disabled until a receipt is attached**; on submit you get "Payment submitted — we'll confirm shortly," and the car shows a **"Verifying payment"** state.
- [ ] As **staff →** `/admin/payments`, the **"Inspection payments"** card lists the pending payment → open it → the drawer shows the **fee summary** + **View receipt** + **Confirm / Reject**.
- [ ] **Confirm** → the booking becomes active (the owner is emailed appointment details); the inspect page's form is now usable.
- [ ] **Reject** (with a reason) → the booking is cancelled, the car is relisted, and the owner is notified.
- [ ] Opening the inspect page for an **unverified** booking shows a **"Payment pending verification"** notice (form blocked) with a link to the Payments desk.
- [ ] A **confirmed** inspection fee appears under **Transactions** with type **"Inspection fee"**; the **owner** sees fees they paid; the **type filter** includes "Inspection fee".
- [ ] The **payment notification** takes staff straight to `/admin/payments`.

---

## Spec 4 — Canonical brand list · ✅ on `main`

**Goal:** Replace the free-text brand field with a **canonical, staff-managed
brand list** so listings are consistent and buyer filtering is clean. Model stays
free-text; unrecognised brands go to an "Other" path flagged for staff.

**Manual checklist**

- [ ] After `migrate`, the brand list is populated — Django admin → **Listings › Brands** shows **~221** brands (Toyota, Mercedes-Benz, Innoson… popular ones on top). Or hit `GET /api/v1/listings/cars/brands`.
- [ ] **New listing:** the **Brand** field is a **searchable dropdown** (not free text) — type to filter (e.g. `toy` → Toyota) and pick one. Model stays a plain text field.
- [ ] Pick **"Other (not listed)"** → a **text input** appears; type a brand not on the list and submit → the car is created **flagged** (`brand_other` set, `brand` blank; visible in admin).
- [ ] **Buyer browse** → the **Brand filter** lists the **canonical, deduped** brands (no "Benz" vs "Mercedes-Benz").
- [ ] **Edit** a car in "Changes requested" → the same **brand picker** is used (an "Other" car pre-fills its typed value).
- [ ] **Staff reconciliation:** add a brand in admin (Brands → Add) → it appears in the picker; correct a flagged car by setting `brand` and clearing `brand_other`.
- [ ] **Existing data:** cars that pre-dated this feature had their brands **auto-canonicalized** (e.g. "Nissan Ultima" → brand "Nissan"); alias check:
  ```bash
  cd backend && uv run python manage.py shell -c "from apps.listings.brands_data import match_brand; print(match_brand('benz'), match_brand('vw'), match_brand('range rover'), match_brand('toyata'))"
  # → Mercedes-Benz Volkswagen Land Rover Toyota
  ```

---

## Spec 5 — VIN transfer & relist a sold VIN · ✅ on `main`

**Goal:** Let the buyer of a completed peer-to-peer sale relist that same physical
vehicle (same VIN) later. There's no new model — a **completed** `Deal` **is the proof
of ownership**; the sold car stays archived, and the proven buyer lists fresh.

**Setup:** you need a **completed** buy deal. Owner lists a buy car → customer
makes an offer → owner accepts (creates the Deal) → seller opens `/deals/[id]` and
clicks **"Mark as sold"** (car → archived). The **buyer must be a verified owner**
to relist (customers go through the normal owner onboarding first).

**Manual checklist**

- [ ] As the **buyer** of a **completed** deal, open `/deals/[id]` → a **"Relist this vehicle"** button is shown (only for the buyer, only when the deal is completed).
- [ ] Click it → the **Add-car** form opens with the **VIN prefilled** (`/owner/my-cars/new?vin=…`). If you're not yet a verified owner, you hit the existing owner gate.
- [ ] Finish the listing (fresh photos, and it goes through inspection again like any new listing) → it **saves successfully** with the same VIN. The old sold car stays archived under the original seller.
- [ ] **A different owner** entering that same VIN in Add-car is **rejected** with _"You can only relist a vehicle you bought through the platform."_
- [ ] A VIN that's on a **live (non-archived)** listing is rejected with _"already registered."_
- [ ] _(Resale chain)_ If the buyer later sells the relisted car to someone else, only that newest buyer can relist it next — the previous owner is blocked.

---

## Spec A — Dealer branches · 🚧 on `feat/spec6-dealer-branches`

**Goal:** Give verified **fleet/business** owners multiple physical **branch**
locations (name, address, dedicated phone/email). The business name is inherited
and read-only per branch. A verified fleet owner must create at least one branch
before they can list a car. (This is the foundation for later specs — team
members, branch-tagged listings, and the inspect→publish pipeline.)

**Setup:** sign in as an **owner** whose profile is a **verified fleet** business
(`owner_type = fleet`, `is_verified = true` — set in Django admin; give it a
`fleet_name`). An **individual** owner is unaffected by all of this.

**Manual checklist**

- [ ] As a verified **fleet** owner, the dashboard **Quick Actions** shows a **"Branches"** tile (individual owners don't see it). Open `/owner/branches`.
- [ ] With **no branches yet**, you see the **onboarding empty state** ("Set up your first branch") with your **business name** shown as the parent, and an **"Add your first branch"** button.
- [ ] Try to **list a car** (`/owner/my-cars/new`) with no branch → you're **redirected to `/owner/branches`** with a "set up a branch first" notice. (Backend also rejects it with a 400.)
- [ ] **Add a branch** → the dialog shows a **read-only Business name** field (greyed, lock icon, "Inherited from your business — can't be changed here"), plus Branch name, State (searchable), City, Street address, Phone, Email. **All required**; submitting empty / a bad email shows **inline errors**.
- [ ] Save → toast **"Branch created"**, the card appears (name, business badge, address, phone, email, green **Active** status).
- [ ] Now **list a car** again → the form loads (gate cleared).
- [ ] **Edit** a branch (⋯ menu) → business name still read-only; changes save with **"Branch updated"**.
- [ ] **Retire** a branch (⋯ menu) → confirm dialog ("Retire this branch?") → the card dims with a **"Retired"** badge; toast **"Branch retired"**. Its menu now offers **Reactivate** → **"Branch reactivated"**.
- [ ] A **second branch with the same name** is rejected (**"You already have a branch with this name."**).
- [ ] Loading shows **skeleton cards**; an **individual** owner visiting `/owner/branches` sees a "branches are for business accounts" notice.
- [ ] _(Isolation)_ Branches are per-business — another fleet owner never sees yours (API returns 404 for cross-business access).

---

### How brands get populated (for reviewers)

Brands live in the `Brand` table and are seeded by **migrations**, so a fresh
clone just needs `python manage.py migrate` — no manual step. When we grow the
bundled list we add a small `reseed_brands` migration, so existing databases
converge on `migrate` too. (`python manage.py seed_brands` is available to force
a re-seed, and `conftest.py` seeds for the pytest suite.)
