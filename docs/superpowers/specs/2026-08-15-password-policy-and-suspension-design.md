# Password Policy & Team-Member Suspension — Design

Two account-security features, sharing the same subsystems (auth serializers/views,
frontend auth schemas).

## Feature A — Password policy

**Policy:** 8–128 characters, with at least one uppercase letter, at least one
lowercase letter, and at least one number **or** symbol (either satisfies).

**On-page label** (shown under every password field):
> Must be at least 8 characters, including an uppercase letter, a lowercase
> letter, and a number or symbol.

### Backend (single source of truth)

- New `common/password_validation.py` → `PasswordComplexityValidator`:
  - `validate(password, user=None)` raises `ValidationError` with a specific
    message per missing rule: no uppercase / no lowercase / no number-or-symbol /
    over 128 chars.
  - `get_help_text()` returns the label text.
- Register in `AUTH_PASSWORD_VALIDATORS` (base.py), alongside the existing
  `MinimumLengthValidator` (min 8, made explicit).
- Every password entry point runs Django's `validate_password`:
  - `ResetPasswordSerializer` — already calls it.
  - `SignUpSerializer` — add a `validate_password` method.
  - `ChangePasswordSerializer` — add a `validate_new_password` method.
  - Add `max_length=128` to each of these password fields.
- Team-member setup runs through the reset-password flow, so it's covered.

### Frontend (Zod + visible label)

- `src/features/auth/schemas.ts`: add a shared `passwordSchema` and a
  `PASSWORD_HINT` constant. Replace the four scattered `min(8)` password rules
  (customer sign-up, owner sign-up, change-password, and the inline reset schema
  in `reset-password/page.tsx`) with `passwordSchema`.
  - `passwordSchema` = `.min(8).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9\p{P}\p{S}]/u)`
    with a specific message per rule.
- Render `PASSWORD_HINT` under the password field on: customer sign-up, owner
  sign-up, owner & customer profile-edit password sections, and the
  reset-password page.

## Feature B — Suspended team members

**"Suspended" == `TeamMembership.is_active = False`** (the existing Deactivate
action). We do **not** overload `User.is_active` (sign-in already treats
`is_active=False` as "email not verified" and would send a code).

### Backend

- New helper `is_suspended_team_member(user)` in `apps/users/services.py`:
  `role == TEAM_MEMBER and not TeamMembership.objects.filter(user=user, is_active=True).exists()`.
- Enforce at every token chokepoint:
  - `common/authentication.py` `JWTAuthentication` — runs per request, so a
    suspended member's existing access token is rejected on the next call ⇒
    immediate logout. Raises `AuthenticationFailed(SUSPENDED_MESSAGE)`.
  - `SignInView` — after the password check, if suspended return
    `403 {"detail": SUSPENDED_MESSAGE}` and send no access code.
  - `VerifyView` — reject a suspended member before issuing tokens.
  - `RefreshView` — reject a suspended member before minting an access token.
- `SUSPENDED_MESSAGE = "Your account has been suspended. Contact your account owner."`
- Trigger already exists: `TeamDeactivateView` sets `is_active=False`;
  Reactivate restores access. No change needed there.

### Frontend

- Immediate logout: the API client already redirects to sign-in on a 401 — once
  the token is rejected, the next request bounces the member out. (Confirm the
  path exists; add if missing.)
- Sign-in page: surface the 403 `detail` so a suspended member sees the
  suspension message instead of a generic error.

## Testing

- Backend password: validator accepts a compliant password and rejects each
  missing class (no upper / no lower / no number-or-symbol / too short / too
  long); sign-up, change-password, and reset serializers each reject a weak
  password.
- Backend suspension: a suspended member is rejected by `JWTAuthentication` on an
  authenticated endpoint, at sign-in (with the message), at verify, and at
  refresh; reactivating restores access; an active member and a normal owner are
  unaffected.
- Frontend: `passwordSchema` accepts/rejects the same cases; sign-in shows the
  suspension message.
