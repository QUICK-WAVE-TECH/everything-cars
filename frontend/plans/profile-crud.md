# Profile CRUD — Implementation Plan

**Goal:** Enable users to edit their profile information (name, phone, address, etc.) and change their password, for both customer and owner roles.

**Approach:** Walk-through mode — Namy writes the code, Claude reviews.

---

## Phase 1: Backend — Extend PATCH /users/me

### What to do:

Update `MeView.patch()` in `backend/apps/users/views.py` to handle nested profile updates in a single request.

**Current:** Only updates User fields (first_name, last_name, phone).
**Target:** Also updates CustomerProfile or OwnerProfile fields in the same PATCH.

### Steps:

1. **Create `CustomerProfileUpdateSerializer`** in `serializers.py`:
   ```python
   class CustomerProfileUpdateSerializer(serializers.ModelSerializer):
       country = CountryField(required=False)
       class Meta:
           model = CustomerProfile
           fields = ["drivers_license", "date_of_birth", "address", "state", "city", "country"]
   ```

2. **Create `OwnerProfileUpdateSerializer`** in `serializers.py`:
   ```python
   class OwnerProfileUpdateSerializer(serializers.ModelSerializer):
       country = CountryField(required=False)
       class Meta:
           model = OwnerProfile
           fields = ["fleet_name", "national_id", "location", "rc_number", "country", "state", "city", "address", "bank_account", "bank_name"]
           # Note: owner_type and is_verified are NOT editable
   ```

3. **Update `MeView.patch()`** to also update the profile:
   ```python
   def patch(self, request):
       user = self._get_user(request)
       
       # Update User fields
       user_serializer = UserProfileSerializer(user, data=request.data, partial=True)
       user_serializer.is_valid(raise_exception=True)
       user_serializer.save()
       
       # Update profile fields based on role
       if user.role == "customer" and hasattr(user, "customer_profile"):
           profile_serializer = CustomerProfileUpdateSerializer(
               user.customer_profile, data=request.data, partial=True
           )
           profile_serializer.is_valid(raise_exception=True)
           profile_serializer.save()
       elif user.role == "owner" and hasattr(user, "owner_profile"):
           profile_serializer = OwnerProfileUpdateSerializer(
               user.owner_profile, data=request.data, partial=True
           )
           profile_serializer.is_valid(raise_exception=True)
           profile_serializer.save()
       
       user = self._get_user(request)
       return Response(MeSerializer(user).data)
   ```

4. **Add `validate_country`** to both update serializers to uppercase the ISO code (same pattern as SignUpSerializer).

### Verification:
```bash
# Test customer profile update
curl -X PATCH http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Updated", "address": "New Address", "state": "Lagos"}'
```

---

## Phase 2: Backend — Change Password Endpoint

### What to do:

Add `POST /api/v1/auth/change-password` — authenticated users can change their password by providing old + new password.

### Steps:

1. **Create `ChangePasswordSerializer`** in `serializers.py`:
   ```python
   class ChangePasswordSerializer(serializers.Serializer):
       old_password = serializers.CharField()
       new_password = serializers.CharField(min_length=8)
   ```

2. **Create `ChangePasswordView`** in `views.py`:
   ```python
   class ChangePasswordView(APIView):
       permission_classes = [IsAuthenticated]

       def post(self, request):
           serializer = ChangePasswordSerializer(data=request.data)
           serializer.is_valid(raise_exception=True)
           
           if not request.user.check_password(serializer.validated_data["old_password"]):
               return Response(
                   {"detail": "Current password is incorrect."},
                   status=status.HTTP_400_BAD_REQUEST,
               )
           
           request.user.set_password(serializer.validated_data["new_password"])
           request.user.save(update_fields=["password"])
           
           return Response(
               {"message": "Password changed successfully."},
               status=status.HTTP_200_OK,
           )
   ```

3. **Add URL** to `auth_urls.py`:
   ```python
   path("change-password", ChangePasswordView.as_view(), name="auth-change-password"),
   ```

### Verification:
```bash
curl -X POST http://localhost:8000/api/v1/auth/change-password \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"old_password": "current123", "new_password": "newpass123"}'
```

---

## Phase 3: Frontend — API Hooks + Zod Schema

### What to do:

Add `useUpdateProfile` mutation hook and a Zod schema for profile updates.

### Steps:

1. **Add `profileUpdateSchema`** to `frontend/src/features/auth/schemas.ts`:
   ```typescript
   export const profileUpdateSchema = z.object({
     first_name: z.string().trim().min(2, "First name required"),
     last_name: z.string().trim().min(2, "Last name required"),
     phone: phoneSchema,
     // Customer fields
     drivers_license: z.string().trim().optional(),
     date_of_birth: z.string().trim().optional(),
     address: z.string().trim().optional(),
     state: z.string().trim().optional(),
     city: z.string().trim().optional(),
     country: z.string().trim().optional(),
   });

   export const changePasswordSchema = z.object({
     old_password: z.string().min(1, "Current password required"),
     new_password: z.string().min(8, "Password must be at least 8 characters"),
     confirm_password: z.string(),
   }).refine((data) => data.new_password === data.confirm_password, {
     message: "Passwords do not match",
     path: ["confirm_password"],
   });
   ```

2. **Add hooks** to `frontend/src/features/auth/api/auth-api.ts`:
   ```typescript
   export function useUpdateProfile() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: (data: Record<string, unknown>) =>
         apiClient.patch<UserProfile>("/users/me", data),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["me"] });
       },
     });
   }

   export function useChangePassword() {
     return useMutation({
       mutationFn: (data: { old_password: string; new_password: string }) =>
         apiClient.post<{ message: string }>("/auth/change-password", data),
     });
   }
   ```

3. **Export from barrel** `frontend/src/features/auth/api/index.ts`.

### Verification:
- Build passes: `npm run build`
- Types compile: `npx tsc --noEmit`

---

## Phase 4: Frontend — Editable Customer Profile Page

### What to do:

Convert the read-only customer profile page to an editable form with save/cancel.

### Pattern — File: `frontend/src/app/customer/profile/page.tsx`

1. **Add edit mode state:** `const [editing, setEditing] = useState(false)`
2. **When editing=false:** show current read-only fields (as now)
3. **When editing=true:** show react-hook-form with:
   - AuthField for first_name, last_name
   - PhoneField for phone
   - Date picker for date_of_birth
   - AuthField for drivers_license
   - CountrySelect for country
   - StateSelect for state
   - CityCombobox for city
   - AuthField for address
4. **Add "Edit Profile" button** that toggles editing mode
5. **Add "Save" (loading) + "Cancel" buttons** in edit mode
6. **On save:** call `useUpdateProfile` mutation → on success: toast + exit edit mode
7. **On cancel:** reset form to current values + exit edit mode
8. **Add "Change Password" section** below profile:
   - Collapsible card
   - Old password, new password, confirm password fields
   - Save button → calls `useChangePassword`

### Anti-patterns:
- Do NOT use inline styles for form fields — reuse existing components
- Do NOT create a separate endpoint — use PATCH /users/me
- Do NOT allow editing email or role

### Verification:
- Edit first_name → save → refresh → new name persists
- Edit address → save → check Django admin → updated
- Change password → sign out → sign in with new password

---

## Phase 5: Frontend — Owner Profile Page

### What to do:

Create owner profile page at `frontend/src/app/owner/profile/page.tsx` (currently doesn't exist).

### Pattern:
- Copy customer profile page structure
- Display owner-specific fields: owner_type (read-only), fleet_name, national_id, location, rc_number, bank_account, bank_name, country, state, city, address
- Same edit/save/cancel pattern
- Same change password section
- Owner type and is_verified are read-only (not editable)

### Verification:
- Navigate to `/owner/profile` when logged in as owner
- Edit bank_name → save → check backend
- Change password works for owner role

---

## Phase 6: Final Verification

1. **Backend tests:** `uv run pytest -v`
2. **Frontend build:** `npm run build`
3. **Frontend lint:** `npm run lint`
4. **End-to-end test:**
   - Customer: edit profile → save → refresh → verify changes persisted
   - Owner: edit profile → save → refresh → verify
   - Change password → sign out → sign in with new password
   - Try editing email → should not be possible
   - Try editing role → should not be possible
5. **Commit and push**

---

## Anti-Pattern Guards

- **DO NOT** let users change their email through profile edit
- **DO NOT** let users change their role (customer/owner)
- **DO NOT** let owners change their owner_type after creation
- **DO NOT** store passwords in plain text
- **DO NOT** use `form.watch()` in owner sign-up (known React Compiler warning) — use `useWatch` instead
- **DO** use `select_related` on all MeView queries
- **DO** use `partial=True` on all update serializers
- **DO** uppercase country codes before saving
- **DO** invalidate the `["me"]` React Query cache after profile updates
