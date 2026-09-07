# Admin Audit Checklist

This document is the source of truth for the `/admin` regression matrix, route audit, manual high-risk pass, and pre-release smoke checklist.

## Role Model

- `viewer`
  - May load admin pages and admin GET routes.
  - Must not be able to trigger writes.
  - UI should show read-only treatment and disabled write controls where supported.
- `editor`
  - Has all viewer access.
  - May create, update, seed, review, complete, and delete admin-managed coaching data.
- `admin`
  - Has all editor access.
  - May also manage staff roles and invites on `/admin/team` and `/api/admin/staff`.

## Admin Surface Inventory

### `/admin`

- Purpose: free-analyzer dashboard, analytics, leads, destructive cleanup.
- Viewer expectations:
  - Can load charts, attempts table, survey joins, and stats.
  - Can not delete one or many analyses.
- Editor expectations:
  - Can trigger single delete.
  - Can trigger bulk delete.
  - Can trigger timing backfill through the refresh path.
- Admin expectations:
  - Same as editor.

### `/admin/clients`

- Purpose: coaching-client roster and pending signup approval.
- Viewer expectations:
  - Can load active clients and pending clients.
  - Can open client detail links.
  - Can not create, edit, approve, or delete.
- Editor expectations:
  - Can create clients.
  - Can edit focus, status, start date, and meeting link.
  - Can approve pending Google signups.
  - Can delete non-sample clients.
- Admin expectations:
  - Same as editor.

### `/admin/clients/[id]`

- Purpose: highest-risk coaching workspace for one client.
- Viewer expectations:
  - Can load client, tasks, sessions, intro call data, LinkedIn drawer, and transcript tools.
  - Can not assign tasks, edit tasks, delete tasks, rate tasks, complete tasks, save intro call, save session recap, or generate side-effecting content.
- Editor expectations:
  - Can ensure starter program tasks exist.
  - Can create manual tasks.
  - Can edit task copy and requirement toggles.
  - Can mark review-required tasks complete.
  - Can review and rate submitted tasks.
  - Can delete tasks.
  - Can save intro call overview.
  - Can save session recap.
  - Can generate transcript-to-workout draft content.
  - Can download submitted recordings.
- Admin expectations:
  - Same as editor.

### `/admin/exercises`

- Purpose: Problem Bible catalog management.
- Viewer expectations:
  - Can load the full catalog and filters.
  - Can not seed, toggle enabled state, upsert, or remove entries.
- Editor expectations:
  - Can seed missing entries.
  - Can reseed and overwrite matching slugs after confirm.
  - Can upsert coach-created or edited entries.
  - Can enable/disable entries.
  - Can remove entries.
- Admin expectations:
  - Same as editor.

### `/admin/prompt`

- Purpose: diagnosis core prompt override plus prompt add-on CRUD.
- Viewer expectations:
  - Can load core prompt and add-ons.
  - Can not save/reset core prompt or create/update/toggle/delete add-ons.
- Editor expectations:
  - Can save core prompt override.
  - Can reset core prompt override to code default.
  - Can create, edit, toggle, and delete add-ons.
- Admin expectations:
  - Same as editor.

### `/admin/status`

- Purpose: read-only service health checks.
- Viewer expectations:
  - Can load system status.
- Editor expectations:
  - Same as viewer.
- Admin expectations:
  - Same as viewer.

### `/admin/team`

- Purpose: staff role assignment and invite management.
- Viewer expectations:
  - Can not manage team.
- Editor expectations:
  - Can not manage team.
- Admin expectations:
  - Can load current members and pending invites.
  - Can assign viewer/editor/admin roles.
  - Can remove roles.
  - Can not remove the only remaining admin.

## Admin API Audit

### Read routes

- `GET /api/admin/analyses`
  - Guard: `viewer`
  - Convex targets: `analyses.listRecent`, `analyses.getStats`, optional `analyses.backfillAnalysisDuration`
  - Side effects: only when `backfillTiming=1`
- `GET /api/admin/clients`
  - Guard: `viewer`
  - Convex target: `coaching.listClients`
  - Side effects: none
- `GET /api/admin/clients/[id]`
  - Guard: `viewer`
  - Convex targets: `coaching.ensureProgramTasks`, `coaching.getClient`, `coaching.listTasksForClient`, `coachingSessions.listForClient`
  - Side effects: seeds missing starter tasks
- `GET /api/admin/clients/pending`
  - Guard: `viewer`
  - Convex target: `coaching.listPendingClients`
  - Side effects: none
- `GET /api/admin/exercises`
  - Guard: `viewer`
  - Convex target: `workoutCatalog.list`
  - Side effects: none
- `GET /api/admin/intro-call`
  - Guard: `viewer`
  - Convex target: `introCall.getByClient`
  - Side effects: none
- `GET /api/admin/prompt-addons`
  - Guard: `viewer`
  - Convex targets: `promptAddOns.list`, `diagnosisCorePrompt.get`
  - Side effects: none
- `GET /api/admin/recordings`
  - Guard: `viewer`
  - Convex target: `coaching.getTask`
  - Side effects: none
- `GET /api/admin/session-recap`
  - Guard: `viewer`
  - Convex target: `coachingSessions.getRecap`
  - Side effects: none
- `GET /api/admin/sessions`
  - Guard: `viewer`
  - Convex target: `coachingSessions.listForClient`
  - Side effects: none
- `GET /api/admin/staff`
  - Guard: none for self payload, `admin` when `team=1`
  - Convex target: `staff.getMyStaff`, `staff.listStaff`
  - Side effects: may bootstrap first admin through `staff.tryBootstrapAdmin`
- `GET /api/admin/status`
  - Guard: `viewer`
  - Side effects: external service checks only
- `GET /api/admin/surveys`
  - Guard: `viewer`
  - Side effects: none
- `POST /api/admin/transcript-to-workout`
  - Guard: `editor`
  - Convex reads: `coaching.getClient`, `introCall.getByClient`
  - Side effects: none in storage; generates a draft only

### Write routes

- `DELETE /api/admin/analyses`
  - Guard: `editor`
  - Convex targets: `analyses.remove`, `analyses.removeMany`
- `POST /api/admin/clients`
  - Guard: `editor`
  - Convex target: `coaching.createClient`
- `PATCH /api/admin/clients`
  - Guard: `editor`
  - Convex target: `coaching.updateClient`
- `DELETE /api/admin/clients`
  - Guard: `editor`
  - Convex target: `coaching.removeClient`
- `POST /api/admin/clients/pending`
  - Guard: `editor`
  - Convex target: `coaching.approveClientSignup`
- `POST /api/admin/exercises`
  - Guard: `editor`
  - Convex targets: `workoutCatalog.seedBatch`, `workoutCatalog.setEnabled`, `workoutCatalog.remove`, `workoutCatalog.upsert`
- `PUT /api/admin/intro-call`
  - Guard: `editor`
  - Convex target: `introCall.upsert`
- `POST /api/admin/prompt-addons`
  - Guard: `editor`
  - Convex target: `promptAddOns.create`
- `PATCH /api/admin/prompt-addons`
  - Guard: `editor`
  - Convex targets: `promptAddOns.update`, `promptAddOns.setEnabled`
- `DELETE /api/admin/prompt-addons`
  - Guard: `editor`
  - Convex target: `promptAddOns.remove`
- `PUT /api/admin/prompt-addons`
  - Guard: `editor`
  - Convex targets: `diagnosisCorePrompt.set`, `diagnosisCorePrompt.clear`
- `POST /api/admin/session-recap`
  - Guard: `editor`
  - Convex target: `coachingSessions.upsertRecap`
- `POST /api/admin/sessions`
  - Guard: `editor`
  - Convex target: `coachingSessions.markReady`
- `POST /api/admin/tasks`
  - Guard: `editor`
  - Convex target: `coaching.createTask`
- `PATCH /api/admin/tasks`
  - Guard: `editor`
  - Convex targets: `coaching.completeTask`, `coaching.updateTask`, `coaching.rateTask`
- `DELETE /api/admin/tasks`
  - Guard: `editor`
  - Convex target: `coaching.removeTask`
- `POST /api/admin/staff`
  - Guard: `admin`
  - Convex target: `staff.setStaffRole`

## Convex Hardening Notes

- Admin-only Convex mutations now enforce staff roles directly.
- Admin-only Convex queries for analyses, client list/detail, task detail, and pending signups now enforce at least `viewer`.
- The legacy `ADMIN_PASSWORD` fallback has been removed from server staff resolution so route auth and Convex auth use the same source of truth.

## Manual High-Risk Regression Pass

Run these in order with one viewer account, one editor account, and one admin account.

### 1. Clients list and pending approval

- As viewer, load `/admin/clients` and verify the list renders while create/edit/delete controls are disabled.
- As editor, approve one pending Google signup and verify the row disappears from pending and appears in the main roster.
- As editor, create a client, edit focus/status/start date/meeting link, refresh, and verify the saved values persist.
- As editor, try deleting the sample demo client and confirm the API blocks it.
- As editor, delete a normal test client and confirm the row disappears after refresh.

### 2. Client detail: tasks, ratings, and recordings

- Open `/admin/clients/[id]` for a real client and confirm the page loads client, tasks, sessions, intro call, and LinkedIn data.
- Create one manual written task and one audio-required task.
- Edit each task and verify title, instructions, and requirement toggles persist.
- Submit a task from the client side or seed one submitted task, then rate it and confirm status changes to `Reviewed`.
- For a review-required task, mark it complete from admin and verify status changes to `Done`.
- Delete a task and verify it disappears without disturbing the remaining task order.
- Download one recording and confirm the file response is returned.

### 3. Intro call, recap, and transcript-to-workout

- Save the intro call overview and reload to confirm the document persists.
- Save one session recap and verify it reloads through both admin and client recap views.
- Run transcript-to-workout in `summary`, `tasks`, and `both` modes.
- Confirm invalid source or target session numbers are rejected.
- Confirm the generated draft does not mutate client data until the explicit save step in the UI.

### 4. Analyses dashboard

- Load `/admin` and confirm attempts, charts, and survey joins render.
- Delete one analysis row and verify the table updates.
- Bulk-delete multiple rows and verify the deleted and missing counts are correct.
- Load with timing backfill enabled and confirm the request succeeds without data corruption.

### 5. Exercise catalog

- Load `/admin/exercises` as viewer and confirm filters/search work but write buttons are disabled.
- As editor, run `Seed missing only` and verify counts return without overwriting edited slugs.
- As editor, run full reseed only after confirm and verify overwritten rows refresh.
- Toggle one exercise enabled state, refresh, and verify the change persists.
- Create, edit, and remove one coach-created exercise.

### 6. Prompt admin

- Load `/admin/prompt` as viewer and confirm add-ons and core prompt are visible but read-only.
- As editor, create an add-on, toggle it off and on, edit it, then delete it.
- Save a core prompt override, reload, and verify `isOverride` remains true.
- Reset the core prompt and verify the code default is shown again.

### 7. Team access

- As admin, load `/admin/team` and verify members plus pending invites appear.
- Assign viewer, editor, and admin roles to test emails and verify refresh persistence.
- Remove one non-admin role and verify it disappears.
- Try removing the only remaining admin and verify the API blocks it.

## Pre-Release Smoke Checklist

- Sign in with viewer, editor, and admin accounts at least once after deploy.
- Open `/admin` and confirm analyses and stats load.
- Delete one disposable analysis row.
- Open `/admin/clients` and confirm roster plus pending signups load.
- Open one client detail page.
- Create one task, edit it, and delete it.
- Save one intro call overview.
- Save one session recap.
- Run transcript-to-workout once.
- Open `/admin/exercises` and toggle one entry.
- Open `/admin/prompt` and confirm core prompt plus add-ons load.
- Open `/admin/team` as admin and verify the list renders.

## Release-Day 5-Minute Checklist

Use this shorter pass right before deploy or immediately after deploy when you only want the highest-signal checks.

- Log in once as an `editor` and once as an `admin`.
- Open `/admin` and confirm the analyses table loads.
- Delete one disposable analysis row.
- Open `/admin/clients` and load one real client detail page.
- Create one disposable task, edit it once, then delete it.
- Run transcript-to-workout once and confirm a draft returns.
- Open `/admin/exercises` and toggle one exercise enabled state.
- Open `/admin/prompt` and confirm core prompt and add-ons load.
- Open `/admin/team` as admin and confirm the page loads.

If all eight checks pass, the admin surface is usually safe enough for a normal release. If any one fails, stop and investigate before deploying broader product changes.

## Suggested Test Data

- One pending Google-signup client.
- One active non-sample client with at least one submitted audio task.
- One disposable analysis row or batch tagged for cleanup.
- One coach-created catalog exercise.
- One prompt add-on safe to create and delete during testing.
