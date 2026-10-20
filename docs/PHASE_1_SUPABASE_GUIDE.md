# Phase 1 - Supabase database guide

This phase is ready to install manually. It is designed for a fresh Supabase project.

## Before you begin

You need a free Supabase account and one new project. Do not place the `service_role` key in frontend code or screenshots. For the university demo, enable Email authentication; phone OTP needs a paid/configured SMS provider and belongs in Phase 3.

The original UI and project documents are kept in `docs/reference/` as source material. The HTML remains the visual source of truth for Phase 2.

## Step 1 - Create a Supabase project

1. Go to Supabase Dashboard and create a project named `haven-dev`.
2. Choose a nearby region and generate a strong database password.
3. In **Project Settings > API**, record the Project URL and anon key for later frontend work.
4. Never expose the service-role key. It will only be used by the Phase 3 backend.

## Step 2 - Run the schema

Open **SQL Editor > New query**. Copy and run the complete contents of:

`supabase/migrations/001_initial_schema.sql`

Expected result: `Success. No rows returned`. Then open **Table Editor** and confirm that `profiles`, `categories`, `complaints`, and the related workflow tables exist.

## Step 3 - Apply privacy and access rules

Run:

`supabase/migrations/002_row_level_security.sql`

This enables RLS on every public table. It also creates helper functions and a safe `submit_complaint` RPC. The browser is intended to read authorized data directly; sensitive admin writes should later go through the backend.

## Step 4 - Create private storage

Run:

`supabase/migrations/003_storage.sql`

Two private buckets are created:

- `complaint-media` for images, video, and audio;
- `generated-documents` for complaint applications and evidence checklists.

Citizen media paths must use this format:

```text
USER_ID/COMPLAINT_ID/random-file-name.jpg
```

Never store a permanent public URL in `attachments.storage_path`.

## Step 5 - Load optional demo data

Run `supabase/seed.sql`. It inserts three draft playbooks and sample teams. Draft playbooks are not approved for real safety use. The main categories were already added by migration 001.

Legal entries are intentionally not seeded. Exact Pakistani law sections, amendments, helplines, and safety wording must be checked by qualified people before `is_verified` or `is_approved` becomes true.

## Step 6 - Create demo accounts and roles

In **Authentication > Users**, create five email/password users. A matching `profiles` row is created automatically.

Copy each user UUID. In SQL Editor, update only your demo accounts:

```sql
update public.profiles set role = 'citizen' where id = '703ac327-908f-4e87-82b5-303ea02b5eb3';
update public.profiles set role = 'control_room_admin' where id = 'af5c98c5-a1bc-432b-a4cb-c281064625f9';
update public.profiles set role = 'department_officer' where id = 'fbf43238-f149-4ff1-9fbd-c1db6e263004';
update public.profiles set role = 'response_team' where id = 'b4b348bf-e87e-4f77-a9ae-02d5d4a894a8';
update public.profiles set role = 'super_admin' where id = 'a81375f8-3408-4a1b-a6f8-cf9ce638dcc0';
```

Only a trusted project owner should assign staff roles. Never add a public “choose my role” screen.

## Step 7 - Enable Realtime

Run:

`supabase/migrations/004_realtime.sql`

The citizen frontend will subscribe to `complaints` and `status_updates`. RLS still determines which rows a signed-in user receives.

## Step 8 - Verify the installation

Run `supabase/smoke_test.sql`. It performs schema assertions inside a transaction and rolls back all temporary test data. A successful result ends with one row containing `Haven Phase 1 database checks passed`.

Also test RLS from the future frontend or Supabase API with real user tokens:

1. Citizen A must not see Citizen B's complaint.
2. A department officer must not see safety complaints.
3. A response-team user must only see assigned complaints.
4. A citizen must not be able to change urgency, status, role, or audit data.
5. Storage uploads outside the signed-in user's first path folder must fail.

## Example complaint submission RPC

After login, the frontend can call:

```ts
const { data, error } = await supabase.rpc('submit_complaint', {
  p_category_code: 'street_harassment',
  p_original_text: 'A person has been following me near the market.',
  p_original_language: 'en',
  p_is_anonymous: true,
  p_latitude: 24.8607,
  p_longitude: 67.0011,
  p_address_text: 'Near the main market'
})
```

The function derives the track from the category, applies simple danger rules, and creates the first status update. AI fields remain suggestions for Phase 3; a human must confirm the final urgency.

## Resetting after a mistake

For a university project, the safest reset is to create a fresh Supabase project and rerun the files in order. Do not run destructive drop scripts against a project containing important data.
