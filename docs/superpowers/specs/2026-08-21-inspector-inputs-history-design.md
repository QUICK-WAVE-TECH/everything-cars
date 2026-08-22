# Full inspector inputs + edit history for publishers — Design

Give the publisher the **complete** inspection report before publishing, plus an
**edit-history timeline**. No in-app inspector edit form (out of scope); the
current edit channel is Django admin, which we track.

## Backend

### Model: `InspectionEditEvent`
- `inspection` FK → `PhysicalInspection`, CASCADE, related_name `edit_events`.
- `editor` FK → User, `SET_NULL`, null; `editor_name` CharField snapshot (so a
  deleted staff account still shows a name, mirroring `CarStatusHistory`).
- `action` = `created` | `edited`.
- `changed_fields` JSONField(default=list) — field names changed (for edits).
- `created_at`; Meta `ordering = ["-created_at"]`.
- Migration.

### Logging
- **Submit** (`StaffInspectionSubmitView`): after creating the inspection, log a
  `created` event (`editor` = inspector).
- **Django admin** (`PhysicalInspectionAdmin.save_model`): on change (not add),
  log an `edited` event with `form.changed_data` and `editor = request.user`.

### Serializer (`InspectionReportSerializer`, publisher's view)
Add the inputs currently omitted:
- `inspector_email`.
- Day-of ID capture: `presented_attendee`, `presented_id_type`,
  `presented_id_number`, `presented_id_document` (staff-only; publisher is staff).
- `documents` (reuse `InspectionDocumentSerializer`).
- `edit_history` — `InspectionEditEventSerializer` list (action, editor_name,
  changed_fields, created_at), newest first.

`PendingPublishingDetailView` prefetches `physical_inspections__edit_events` and
`physical_inspections__documents` (query-optimization standard).

## Frontend (publisher review sheet)
- Render the **complete report**: `features` chips, a **"Presented at
  inspection"** block (attendee + ID on the day), and **uploaded documents**
  (links).
- Add an **"Inspection history"** timeline: "Submitted by {inspector} · {date}",
  then "Edited by {name} · {date} · changed: …".
- Keep "Inspected by {name} ({email}) · {inspected_at}".
- Extend the `InspectionReport` type accordingly.

## Testing
- Submitting an inspection creates a `created` edit event.
- The report serializer returns the full field set + `edit_history`.
- An admin edit appends an `edited` event carrying the changed field names.
- Frontend renders features, presented block, documents, and the history.
