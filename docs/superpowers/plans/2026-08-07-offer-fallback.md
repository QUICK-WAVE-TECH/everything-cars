# Offer Negotiation Fallback (Spec D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve losing offers on accept (`STANDBY`) and revive them to acceptable `PENDING` if the deal falls through, so a seller can accept a fallback without the buyer re-submitting.

**Architecture:** Add `OfferStatus.STANDBY` + `Offer.revived_at`. Change the rival-offer handling in `accept_offer` (→ STANDBY), `complete_deal` (STANDBY → SUPERSEDED), `cancel_deal` / `reverse_deal` (STANDBY → revived PENDING with a fresh 48h TTL). Frontend: status label + a "Re-opened" badge.

**Tech Stack:** Django 5.2 + DRF, pytest-django (`--nomigrations`), Next.js 16 + React Query, shadcn + Tailwind v4 (`--brc-*`), lucide.

**Workflow split:** Backend (Tasks 1–7) written by **Namy** with Claude guiding TDD. Frontend (Tasks 8–10) by **Claude**. No design import.

---

## File Structure

**Backend:**
- `apps/offers/models.py` — `OfferStatus.STANDBY`, `Offer.revived_at` (MODIFY) + migration.
- `apps/offers/services.py` — `accept_offer` rival → STANDBY (MODIFY).
- `apps/sales/services.py` — `complete_deal`, `cancel_deal`, `reverse_deal` (MODIFY).
- `apps/offers/serializers.py` — expose `revived_at` (MODIFY).
- `apps/notifications/templates/emails/...` — reword the accept-time "no longer available" copy to "on standby" (MODIFY, optional polish).
- `apps/offers/tests.py`, `apps/sales/tests.py` — tests (incl. updating existing SUPERSEDED assertions).

**Frontend:**
- `src/features/offers/api/types.ts` — add `"standby"` to `OfferStatus`, `revived_at` to the offer type (MODIFY).
- `src/features/offers/lib/offer-format.ts` — `OFFER_STATUS_META["standby"]` (MODIFY).
- `src/features/offers/components/*` — "Re-opened" badge on the owner offer card/row (MODIFY).

---

## BACKEND (Tasks 1–7 — Namy writes, Claude guides)

### Task 1: `STANDBY` status + `revived_at`

**Files:** `apps/offers/models.py`, migration; Test: `apps/offers/tests.py`.

- [ ] **Step 1: Failing test**

```python
def test_standby_status_and_revived_at_exist():
    from apps.offers.models import Offer, OfferStatus
    assert OfferStatus.STANDBY == "standby"
    assert any(f.name == "revived_at" for f in Offer._meta.get_fields())
```

- [ ] **Step 2: Run** `cd backend && uv run pytest apps/offers/tests.py -k standby_status -v` → FAIL.
- [ ] **Step 3: Implement** — in `apps/offers/models.py`:
  - Add to `OfferStatus` (after `EXPIRED`, before `SUPERSEDED`): `STANDBY = "standby", "On standby — deal in progress"`.
  - Add to `Offer`: `revived_at = models.DateTimeField(null=True, blank=True)`.
- [ ] **Step 4:** `uv run python manage.py makemigrations offers`.
- [ ] **Step 5: Run** → PASS. **Step 6: Commit** `feat(offers): STANDBY status + revived_at`.

---

### Task 2: `accept_offer` → rivals go to STANDBY

**Files:** `apps/offers/services.py`; Test: `apps/offers/tests.py`.

- [ ] **Step 1: Failing test**

```python
class AcceptStandbyTest(APITestCase):
    def setUp(self):
        self.owner = create_user("as-owner@test.com", "owner")
        self.car = create_negotiable_car(self.owner)
        self.a = create_user("buyer-a@test.com")
        self.b = create_user("buyer-b@test.com")
        self.offer_a = Offer.objects.create(car=self.car, customer=self.a,
            amount="14000000.00", currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        self.offer_b = Offer.objects.create(car=self.car, customer=self.b,
            amount="13000000.00", currency="NGN", expires_at=timezone.now() + timedelta(hours=48))

    def test_accepting_puts_rivals_on_standby(self):
        from apps.offers.services import accept_offer
        accept_offer(self.offer_a)
        self.offer_a.refresh_from_db(); self.offer_b.refresh_from_db()
        assert self.offer_a.status == OfferStatus.ACCEPTED
        assert self.offer_b.status == OfferStatus.STANDBY   # not SUPERSEDED
```

(Mirror the `create_negotiable_car` / `create_user` helpers already in `apps/offers/tests.py`.)

- [ ] **Step 2: Run** → FAIL (rivals become SUPERSEDED today).
- [ ] **Step 3: Implement** — in `accept_offer` (`apps/offers/services.py`), change the rivals `.update(status=OfferStatus.SUPERSEDED, ...)` to `status=OfferStatus.STANDBY`.
- [ ] **Step 4: Run** → PASS. Then run the full offers suite; **update any existing test that asserted rivals become `SUPERSEDED` on accept** to expect `STANDBY`.
- [ ] **Step 5: Commit** `feat(offers): accepting an offer puts rivals on standby`.

---

### Task 3: `complete_deal` → standby offers become SUPERSEDED

**Files:** `apps/sales/services.py`; Test: `apps/sales/tests.py`.

- [ ] **Step 1: Failing test** — after `complete_deal`, the car's `STANDBY` offers are `SUPERSEDED`.

```python
def test_completing_deal_closes_standby_offers(self):
    # setUp: an accepted offer + a deal + a rival now on STANDBY
    from apps.sales.services import complete_deal
    complete_deal(self.deal)
    self.rival.refresh_from_db()
    assert self.rival.status == OfferStatus.SUPERSEDED
```

- [ ] **Step 2: Run** → FAIL (nothing closes standby today).
- [ ] **Step 3: Implement** — in `complete_deal`, inside the atomic block after archiving the car:

```python
        from apps.offers.models import Offer, OfferStatus
        Offer.objects.filter(car=car, status=OfferStatus.STANDBY).update(
            status=OfferStatus.SUPERSEDED, responded_at=timezone.now()
        )
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(offers): completing a sale closes standby offers`.

---

### Task 4: `cancel_deal` → revive standby offers to PENDING

**Files:** `apps/sales/services.py`; Test: `apps/sales/tests.py`.

- [ ] **Step 1: Failing test**

```python
def test_cancelling_deal_revives_standby_offers(self):
    from apps.sales.services import cancel_deal
    from apps.sales.models import DealCancelledBy
    before = timezone.now()
    cancel_deal(self.deal, cancelled_by=DealCancelledBy.SELLER)
    self.rival.refresh_from_db()
    assert self.rival.status == OfferStatus.PENDING
    assert self.rival.revived_at is not None
    assert self.rival.expires_at > timezone.now() + timedelta(hours=47)  # fresh TTL
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — in `cancel_deal`, change the `prior` query from `status=OfferStatus.SUPERSEDED` to `status=OfferStatus.STANDBY`, and inside the atomic block revive them:

```python
        from apps.offers.models import Offer, OfferStatus, OFFER_TTL_HOURS
        now = timezone.now()
        prior = list(
            Offer.objects.filter(car=deal.car, status=OfferStatus.STANDBY)
            .select_related("car", "customer")
        )
        Offer.objects.filter(id__in=[o.id for o in prior]).update(
            status=OfferStatus.PENDING,
            expires_at=now + timedelta(hours=OFFER_TTL_HOURS),
            revived_at=now,
        )
```

(Keep the existing `notify_car_available_again` scheduling for each `prior` offer.)

- [ ] **Step 4: Run** → PASS. Update any existing cancel test that expected the prior offers to stay `SUPERSEDED`. Full sales suite green. **Step 5: Commit** `feat(offers): cancelling a deal revives standby offers to pending`.

---

### Task 5: `reverse_deal` (dispute upheld) → same revival

**Files:** `apps/sales/services.py`; Test: `apps/sales/tests.py`.

- [ ] **Step 1: Failing test** — after `reverse_deal`, the car's `STANDBY` offers are revived `PENDING` with `revived_at` set.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — add the same revival block to `reverse_deal` (extract a small helper `_revive_standby_offers(car)` in `apps/sales/services.py` and call it from both `cancel_deal` and `reverse_deal` — DRY). Keep the prior-bidder notifications.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(offers): reversing a deal revives standby offers`.

---

### Task 6: Accept-a-revived-offer + expiry-safety + serializer

**Files:** `apps/offers/serializers.py`; Test: `apps/offers/tests.py`, `apps/sales/tests.py`.

- [ ] **Step 1: Failing tests**
  - **End-to-end fallback:** accept A → cancel deal → rival B is `PENDING` → `accept_offer(B)` opens a new Deal and any *other* revived offer goes back to `STANDBY`.
  - **Expiry safety:** a `STANDBY` offer with a past `expires_at` is **not** expired by the `expire_offers` command (it filters `ACTIVE_OFFER_STATUSES`, which excludes STANDBY). Assert its status stays `STANDBY`.
  - **Serializer:** `OfferSerializer` output includes `revived_at`.
- [ ] **Step 2: Run** → FAIL (serializer field missing; others should pass once services are done — if so, they lock behavior).
- [ ] **Step 3: Implement** — add `revived_at` to the offer serializer field list (read-only). The other two behaviors are already satisfied by Tasks 2–5 + the existing expiry filter.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(offers): expose revived_at; lock revive-and-accept + standby-not-expired`.

---

### Task 7: Full suite + lint (+ email copy)

- [ ] **Step 1:** (optional polish) reword the accept-time rival email template (the one `notify_car_no_longer_available` renders) from "no longer available" to "on standby while another sale is in progress"; confirm `notify_car_available_again` copy says "the seller is reviewing your previously submitted offer."
- [ ] **Step 2:** `cd backend && uv run pytest -q` → all green (existing SUPERSEDED-on-accept / cancel tests updated).
- [ ] **Step 3:** `uv run ruff check .` → clean. **Step 4: Commit** `chore(offers): suite green + standby email copy`.

---

## FRONTEND (Tasks 8–10 — Claude)

### Task 8: Types + status meta
- [ ] Add `"standby"` to the `OfferStatus` union and `revived_at: string | null` to the offer type in `src/features/offers/api/types.ts`. Add `OFFER_STATUS_META.standby = { label: "On standby", tone: "amber" }` (or "muted") in `offer-format.ts`. `tsc` clean. Commit.

### Task 9: "Re-opened" badge + standby state
- [ ] Owner offer card/row (`src/features/offers/components/*`): where `offer.revived_at` is set and status is active, show a subtle **"Re-opened"** badge with subtext "The buyer's earlier deal fell through — you can accept this again." Customer card: a `standby` offer shows the muted "On standby" chip (via the meta), not a rejected look. `tsc` + lint. Commit.

### Task 10: Verify + docs + PR
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npm run build` green; `cd backend && uv run pytest -q && uv run ruff check .` green.
- [ ] Add a **Spec D** section to `MANUAL_TESTING.md` and update `TESTING_GUIDE.md` (Spec 2 / offers area): accept→standby, complete→superseded, cancel/reverse→revived+acceptable, seller accepts a fallback, standby not auto-expired, emails.
- [ ] Use superpowers:finishing-a-development-branch to open the PR.

---

## Self-review notes

- **Spec coverage:** STANDBY + revived_at (T1) · accept→standby (T2) · complete→superseded (T3) · cancel-revive (T4) · reverse-revive (T5) · accept-revived + expiry-safety + serializer (T6) · suite/email (T7) · FE types/meta/badge (T8–T9) · docs/PR (T10). All spec sections mapped.
- **Blast radius:** existing tests asserting rivals → `SUPERSEDED` on accept, and cancel finding `SUPERSEDED` offers, must be updated to `STANDBY` (T2, T4).
- **Type consistency:** `STANDBY = "standby"` value identical BE/FE; revival always sets `status=PENDING`, `expires_at=now+OFFER_TTL_HOURS`, `revived_at=now`; `_revive_standby_offers(car)` shared by cancel + reverse.
- **Deferred:** none — D is the last sub-spec.
