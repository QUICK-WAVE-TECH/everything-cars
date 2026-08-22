# Unverified-owner "Account in review" gate — Design

Block the owner area for owners whose KYC an admin hasn't approved yet, showing a
single "Account in review" screen in place of every owner page.

## Trigger

User is `role === "owner"` and `owner_profile` is missing or
`is_verified === false`. (Owners are `is_active` after email verification, but
`is_verified` stays false until an admin approves KYC.) Team members (no
`owner_profile`) and verified owners are unaffected.

## Mechanism (frontend only)

- New `OwnerVerificationGate` client component, rendered inside the existing
  `AuthGuard` in `src/app/owner/layout.tsx`.
- While `useMe()` is loading → render nothing (AuthGuard already handles this).
- If the trigger matches → render the `AccountReview` screen instead of
  `children`, for **every** `/owner/*` route (no redirects → no loops).
- Otherwise render `children`.

## Account-in-review screen

Reads `useMe()` only. Shows:

- "Your account is under review" heading + a status badge.
- Submitted details read-only: business/personal name, email, account type
  (individual/fleet), fleet name (if fleet), ID type on file.
- "What happens next" — our team reviews your details; you'll get an email as
  soon as you're approved (the approval email already fires on verify).
- Sign out button + a contact-support line.

Styled with existing `--brc-*` tokens; matches the dashboard visual language.

## Backend

No change. The listing endpoint already rejects unverified owners
(`Account must be verified to list cars`), and the screen only reads `me`.

## Testing

- Frontend: an unverified owner sees the review screen (and not owner page
  content); a verified owner sees the page; a team member is unaffected.
