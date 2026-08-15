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

## Spec A — Dealer branches · ✅ on `main`

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

## Spec B — Team members & branch-scoped RBAC · 🚧 on `feat/spec7-team-rbac`

**Goal:** Verified **fleet** owners can add **team-member** staff accounts and
assign each to one or more **branches**. Team members sign in and manage only the
**inventory, offers, and deals for their assigned branches**. Every fleet car is
now **tagged with a branch** when listed. (Folds in the `Car → Branch` attribution;
the inspect→publish pipeline + Inspector/Publisher roles are a later spec.)

**Setup:** a **verified fleet** owner (owner_type=fleet) with at least one branch
(Spec A). Dev uses the console email backend — the team-member "you've been added"
mail prints to the `runserver` terminal. That email contains a **"Set up your
password"** link (`/reset-password?token=…`, valid 7 days); the member sets a
password there, then signs in with their **email + password**.

**Manual checklist**

- [ ] As the fleet **owner**, the dashboard shows a **"Team"** tile (next to Branches). Open `/owner/team`.
- [ ] Empty state ("Build your team") → **Add member**: email + first/last name + optional title + a **branch multi-select** (must pick ≥1). Submitting a **duplicate email** or **no branch** shows inline errors. Save → toast "Member added", the member card appears (avatar, name, title, email, **branch chips**, Active).
- [ ] **Edit** a member (⋯) → email is **read-only**; you can change title + reassign branches. **Deactivate** (confirm dialog) → card dims, "Disabled" badge; ⋯ → **Reactivate**.
- [ ] **Listing gets a branch:** as a **fleet** owner (or team member), `/owner/my-cars/new` shows **only a Branch select** — the **Country/State/City fields are hidden**, and the car inherits its **location from the branch** (state + city from the branch, country from the business). An **individual** owner sees the Country/State/City fields and **no** branch. A fleet owner with no branch is still redirected to Branches.
- [ ] The new member gets a **"Set up your password"** email → open the link, set a password, then **sign in with email + password**. Their dashboard shows a **"Viewing: {branch chips}"** indicator and only **My Cars / Offers / Deals** tiles (no Branches/Team/Transactions).
- [ ] The team member sees **only their assigned branch's** cars in My Cars, and only offers/deals on those cars. A car/offer/deal in an **unassigned** branch is **not found** (404) if hit directly.
- [ ] The team member can **list a car** (must pick one of *their* branches — the car is owned by the business, tagged to that branch), **respond to / accept** an offer on their branch, and **complete/cancel** a deal on their branch.
- [ ] The team member can **book an inspection** for a car in their branch **even though they have no ID/NIN of their own** — the booking uses the **business's** verified identity and is recorded against the business (the owner sees it too). Booking a car in an **unassigned** branch is **not found** (404). If the *business* has no ID on file, the booking modal shows a **"Business ID verification needed — ask your account owner"** notice (no "Go to profile" button, since the member can't fix it).
- [ ] A team member visiting `/owner/branches`, `/owner/team`, or `/owner/transactions` is **redirected** to their dashboard (owner-only).
- [ ] **Retire a branch** (as owner) → it's **removed from every member's** assignments; a member left with no branch sees the "ask your business owner" notice on the list-car page.
- [ ] **Public listing:** a dealer car's detail page shows the **branch location + inherited phone/email**.

---

## Spec C — Two-stage inspect→publish + staff roles · 🚧 on `feat/spec8-inspect-publish`

**Goal:** Passing a physical inspection no longer publishes a car directly —
it lands in a **"Pending Publishing"** queue where a **Publisher** reviews the
inspection and either **publishes** it live or **sends it back** to the owner.
Staff `is_staff` is split into **Inspector** / **Publisher** / **Admin**
(`staff_role`, set in Django admin; existing staff auto-become **admin**).

**Setup:** in Django admin, set a staff user's **Staff role** to `inspector`,
another to `publisher` (leave existing staff as `admin` = both). To reach the
queue you need a car that **passed** inspection (owner books + pays → inspector
starts + submits a **Passed** result).

**Manual checklist**

- [ ] As an **inspector**, submit a **Passed** inspection → the car goes to
  **Pending Publishing** (NOT live yet); the **owner** sees the status
  **"Awaiting Publishing"** (in My Cars + the car detail), and **publishers/admins**
  (not inspectors) get a **"ready to publish"** email + in-app notification.
- [ ] A **publisher** (or admin) sees a **"Publishing"** link in the admin nav; an
  inspector does **not**. `/admin/publishing` shows the queue with a **"N waiting"**
  count, **oldest-first**, search, skeletons, and an **"All caught up"** empty state.
- [ ] Click **Review** → a drawer shows the **listing** (photos, price, branch) and
  the **inspection report** (checks + **inspector's notes** + inspector name/date).
- [ ] **Publish live** (confirm) → the car goes **PUBLISHED** and appears in public
  browse; owner notified.
- [ ] **Send back** → a note (**≥ 15 chars**) is required; on submit the car goes
  **Changes requested** and the owner is notified. A short note is rejected.
- [ ] **Pagination:** with > 20 queued cars, Prev/Next work and the count is right.
- [ ] _(Roles)_ An **inspector** hitting `/admin/publishing` sees a "Publishers only"
  notice; the queue/publish/send-back APIs return **403** for inspectors.
- [ ] _(Public)_ A car in **Pending Publishing** does **not** appear in public
  browse (only Published is live).
- [ ] _(Direct publish)_ In the admin car-status console, only a **publisher/admin**
  can push a listing to **Published**.

---

## Spec D — Offer negotiation fallback · 🚧 on `feat/spec9-offer-fallback`

**Goal:** When a seller accepts one offer, the **other** buyers' offers aren't
discarded — they go **on standby**. If the deal **falls through**, those offers
(and the accepted one) are **revived** so the seller can accept a fallback
**without anyone re-submitting**, and every prior bidder is emailed.

**Setup:** one **buy** car with **two+ customers** who each make an offer.

**Manual checklist**

- [ ] Two customers offer on the same car. As the owner, **accept** Buyer A → a
  Deal opens; **Buyer B's offer shows "On standby"** (not rejected/closed). Buyer B
  gets an "your offer is on standby" notification/email.
- [ ] **Cancel** the deal ("Deal fell through"). Buyer B's offer is **back to
  active/pending** with a **"Re-opened"** badge on the owner's offers list; both
  buyers get the "available again — the seller is reviewing your offer" email.
- [ ] The owner can **accept Buyer B directly** (no re-submission) → a new Deal
  opens; any third standby offer goes back to **On standby**.
- [ ] **Complete** a deal instead (mark as sold) → standby offers become
  **"Closed — vehicle sold"** (terminal, not revived).
- [ ] **Dispute upheld** (staff reverse a completed deal) → standby offers are
  revived the same way as a cancel.
- [ ] _(Buyer view)_ A **standby** offer reads "On standby" with an explanation,
  not "declined."
- [ ] _(Timing)_ A **standby** offer is **not** auto-expired while the deal runs;
  on revival it gets a **fresh 48h** window.

---

## Password policy · 🚧 on `feat/password-policy-and-suspension`

**Goal:** every place a password is set enforces the same rule — **8–128
characters, with an uppercase letter, a lowercase letter, and a number or
symbol** — on both the frontend (Zod, with a visible label) and the backend.

**Manual checklist**

- [ ] On **customer sign-up**, **owner sign-up**, the **profile** password
  section, and the **reset-password** page, a **hint label** states the rule
  ("Must be at least 8 characters, including an uppercase letter, a lowercase
  letter, and a number or symbol.").
- [ ] Typing a weak password (e.g. `password`, `securepass123`, `ALLCAPS1!`,
  `NoNumbersOrSymbols`) shows an **inline error** naming the missing rule and
  blocks submit. `SecurePass123!` (or `Abcdefg1`) is accepted.
- [ ] The **backend rejects** a weak password even if the client is bypassed
  (e.g. reset-password / change-password API returns 400) — try `alllowercase1`.
- [ ] A **team member** setting their password via the invite link
  (`/reset-password?token=…`) is held to the same rule.

## Team-member suspension · 🚧 on `feat/password-policy-and-suspension`

**Goal:** a suspended (deactivated) team member is logged out immediately and
cannot sign back in.

**Manual checklist**

- [ ] As the fleet **owner**, **Deactivate** a team member in `/owner/team`.
- [ ] That member, if currently signed in, is **bounced to `/sign-in`** on their
  next action/navigation (their token stops working immediately).
- [ ] The member **cannot sign in**: entering their correct email + password
  shows an **"Account suspended"** message ("Your account has been suspended.
  Contact your account owner.") and **no access code is sent**.
- [ ] **Reactivate** the member → they can sign in again and regain access to
  their branches.
- [ ] A **normal owner** and an **active** team member are unaffected.

### How brands get populated (for reviewers)

Brands live in the `Brand` table and are seeded by **migrations**, so a fresh
clone just needs `python manage.py migrate` — no manual step. When we grow the
bundled list we add a small `reseed_brands` migration, so existing databases
converge on `migrate` too. (`python manage.py seed_brands` is available to force
a re-seed, and `conftest.py` seeds for the pytest suite.)
