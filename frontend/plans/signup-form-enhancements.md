# Sign-Up Form Enhancements — Implementation Plan

**Goal:** Enhance the customer and owner sign-up forms with a glassmorphic date picker, searchable country dropdown, phone number with country code, and city/state auto-suggestion with API fallback.

---

## Phase 0: Install Dependencies

### Steps:
1. Install shadcn `select` and `command` components:
   ```bash
   npx shadcn@latest add select command -y
   ```
2. Install `date-fns` if not already present:
   ```bash
   npm install date-fns
   ```
3. No backend changes needed — all fields already exist on the Django models.

### Verification:
- `ls frontend/src/components/ui/select.tsx frontend/src/components/ui/command.tsx` — both exist
- `npm run build` passes

---

## Phase 1: Glassmorphic Calendar Popover

### What to implement:
Override the Calendar + PopoverContent styling for DOB fields with glassmorphic design.

### Files to modify:
- `frontend/src/app/(auth)/sign-up/page.tsx` — the date_of_birth FormField (lines ~252-306)

### Pattern:
Apply these styles to `PopoverContent`:
```tsx
<PopoverContent
  className="w-auto p-0"
  align="start"
  style={{
    background: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "var(--brc-radius-lg)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
  }}
>
```

Apply to Calendar wrapper:
```tsx
<Calendar
  className="[&_.rdp-month_caption]:font-[var(--brc-font-ui)] [&_.rdp-day_button]:rounded-lg [&_.rdp-day_button.rdp-day_selected]:bg-[var(--brc-primary)] [&_.rdp-day_button.rdp-day_selected]:text-white [&_.rdp-day_button:hover]:bg-[var(--brc-primary-tint)]"
  ...
/>
```

### Verification:
- Calendar opens with frosted glass background
- Month/year dropdowns still work
- Selected day shows BRC primary color
- No console errors

---

## Phase 2: Country Dropdown Field

### What to implement:
A searchable country combobox component using shadcn Command inside a Popover.

### Files to create:
- `frontend/src/features/auth/components/country-select.tsx` — new reusable component

### Pattern:
```tsx
// Uses shadcn Command (Combobox pattern) inside a Popover
// Reads from COUNTRIES array at frontend/src/features/auth/data/countries.ts
// Type: Country = { iso: string; name: string; dial: string }
// Height: h-14, bg: var(--brc-bg-subtle), border: var(--brc-border)
// Shows flag via flagcdn.com: https://flagcdn.com/20x15/{iso}.png
// Searchable by country name
// Controlled via value (iso code) + onChange
```

### Files to modify:
- `frontend/src/features/auth/components/index.ts` — export CountrySelect
- `frontend/src/features/auth/schemas.ts` — add `country: z.string().optional()` to customerSignUpSchema
- `frontend/src/app/(auth)/sign-up/page.tsx` — add CountrySelect FormField in step 2
- `frontend/src/app/(auth)/owner-sign-up/page.tsx` — add CountrySelect if applicable

### Verification:
- Dropdown opens with search
- Flags show next to country names
- Selecting a country sets the form value
- Build passes

---

## Phase 3: Phone Field with Country Code

### What to implement:
Replace the plain AuthField for phone with the existing PhoneField component.

### Existing component:
- `frontend/src/features/auth/components/phone-field.tsx` — already built, accepts `value`, `onChange`, `code`, `onCodeChange`
- Already exported from barrel at `frontend/src/features/auth/components/index.ts`

### Files to modify:
- `frontend/src/features/auth/schemas.ts` — add `phone_code: z.string().optional()` or validate phone format
- `frontend/src/app/(auth)/sign-up/page.tsx` — replace phone AuthField with PhoneField, wire country auto-sync
- `frontend/src/app/(auth)/owner-sign-up/page.tsx` — same replacement

### Phone field behavior:
- Only accepts digits (add `inputMode="numeric"` and filter non-digits in onChange)
- When user selects a country in the Country dropdown (Phase 2), auto-set the dial code
- Country code selector shows flag + dial code inline

### Verification:
- Typing letters in phone field does nothing
- Selecting Nigeria in country dropdown sets +234 in phone code
- Phone code dropdown works independently too
- Build passes

---

## Phase 4: State/City Auto-Suggestion

### What to implement:
State dropdown (populated by country) and city combobox with auto-suggestion.

### API Choice: CountriesNow API (free, no key needed)
- States endpoint: `POST https://countriesnow.space/api/v0.1/countries/states` body: `{"country": "Nigeria"}`
- Cities endpoint: `POST https://countriesnow.space/api/v0.1/countries/state/cities` body: `{"country": "Nigeria", "state": "Lagos"}`
- Fallback: if API fails, degrade to plain text input

### Files to create:
- `frontend/src/features/auth/hooks/use-geo-data.ts` — React Query hooks for states/cities with fallback

### Pattern:
```tsx
// useStates(country) — fetches states, returns { data: string[], isLoading, isError }
// useCities(country, state) — fetches cities, returns { data: string[], isLoading, isError }
// Both gracefully degrade: if API fails, isError=true, consumer shows plain input
```

### Files to create:
- `frontend/src/features/auth/components/state-select.tsx` — dropdown, populated by useStates
- `frontend/src/features/auth/components/city-combobox.tsx` — combobox with search, populated by useCities

### Files to modify:
- `frontend/src/app/(auth)/sign-up/page.tsx` — replace state/city AuthFields with new components
- `frontend/src/app/(auth)/owner-sign-up/page.tsx` — same if location field benefits

### Fallback behavior:
- API down → show plain text input with placeholder "Type your state/city"
- API loading → show loading spinner in dropdown
- API success → show searchable dropdown/combobox

### Verification:
- Select Nigeria → state dropdown populates with Nigerian states
- Select Lagos → city field shows Lagos cities as suggestions
- Disconnect network → state/city fields become plain text inputs
- Build passes

---

## Phase 5: Apply to Owner Sign-Up + Final Verification

### Files to modify:
- `frontend/src/app/(auth)/owner-sign-up/page.tsx`:
  - Replace phone AuthField with PhoneField
  - Add CountrySelect if location field warrants it
  - Location field could use city/state components for individual owners

### Final verification checklist:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (only the known react-hook-form warning)
- [ ] Customer sign-up: DOB calendar has glassmorphic style
- [ ] Customer sign-up: Country dropdown is searchable with flags
- [ ] Customer sign-up: Phone field has country code + digits only
- [ ] Customer sign-up: State dropdown populates from country
- [ ] Customer sign-up: City field has auto-suggestions
- [ ] Customer sign-up: Full flow works: fill → submit → verify → dashboard
- [ ] Owner sign-up: Phone field has country code + digits only
- [ ] Owner sign-up: Full flow works
- [ ] API fallback: state/city degrade to text input when offline

---

## Anti-Pattern Guards

- **DO NOT** use `asChild` on shadcn Popover/Select triggers — Base UI doesn't support it
- **DO NOT** nest `<button>` inside `<button>` — use `<div>` for trigger content
- **DO NOT** use `fromYear`/`toYear` on Calendar — use `startMonth`/`endMonth` (Date objects)
- **DO NOT** import from `@radix-ui` — this project uses `@base-ui/react`
- **DO NOT** add new backend endpoints — all fields already exist on Django models
- **DO NOT** store API keys on the frontend — CountriesNow API needs no key

---

## Documentation References

| Component | File | Key Props |
|-----------|------|-----------|
| Calendar | `src/components/ui/calendar.tsx` | mode, selected, onSelect, captionLayout, startMonth, endMonth, disabled |
| Popover | `src/components/ui/popover.tsx` | align, side, sideOffset (no asChild) |
| PhoneField | `src/features/auth/components/phone-field.tsx` | value, onChange, code, onCodeChange |
| Countries | `src/features/auth/data/countries.ts` | COUNTRIES array, DEFAULT_COUNTRY, findCountryByDial() |
| AuthField | `src/features/auth/components/auth-field.tsx` | label, placeholder, value, onChange, type, name, required |
| BRC Tokens | `src/app/globals.css:155-170` | --brc-shadow-xs/md/lg, --brc-radius-sm/md/lg/pill |
