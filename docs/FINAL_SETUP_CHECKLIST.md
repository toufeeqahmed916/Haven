# Haven final setup and test checklist

Use this checklist after Phase 3 Step 8. Keep `.env.example` unchanged: it is only a safe template. Put real keys only in `.env`, with no spaces around `=`.

## 1. Finish Supabase

In Supabase Dashboard -> SQL Editor, run migration files in filename order. If `001` through `005` already succeeded, run only:

1. `supabase/migrations/006_ai_files_documents.sql`
2. `supabase/migrations/007_notifications_security.sql`
3. `supabase/smoke_test.sql`

The smoke test should return `Haven Phase 1-3 database checks passed`. It rolls back its own temporary transaction.

Do not run `seed.sql` more than necessary. It contains clearly marked demo teams and unapproved draft playbooks, not verified real services or legal guidance.

## 2. Configure `.env`

The root `.env` should contain:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
VITE_API_URL=http://127.0.0.1:4000

NODE_ENV=development
API_HOST=127.0.0.1
API_PORT=4000
CORS_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:5174

SUPABASE_SECRET_KEY=sb_secret_YOUR_NEW_SERVER_KEY
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=YOUR_GEMINI_KEY
GEMINI_MODEL=gemini-2.5-flash-lite
AI_TIMEOUT_MS=12000

RATE_LIMIT_MAX=300
TRUST_PROXY=false
```

Use a current Supabase `sb_secret_...` key. It is accepted by the existing `SUPABASE_SECRET_KEY` variable and should stay on the API server only. If a real legacy service-role key was placed in `.env.example`, source control, a screenshot, or chat, create a new secret key and deactivate the exposed legacy key after confirming the replacement works.

The Gemini key is server-only. Never rename it to `VITE_GEMINI_API_KEY`.

## 3. Install and run locally

Double-click `setup-haven.cmd` once. Then open three windows in this order:

1. `start-api.cmd` -> `http://127.0.0.1:4000`
2. `start-citizen.cmd` -> `http://127.0.0.1:5173`
3. `start-admin.cmd` -> `http://127.0.0.1:5174/login`

Keep all three windows open. Open `http://127.0.0.1:4000/health`. After adding both keys, it should show `protectedCommands: configured` and `ai: configured`. No secret values are returned.

## 4. Create test accounts

Create citizen and staff users through Supabase Authentication. New accounts start as citizens. Assign staff roles only from SQL Editor using the authenticated user's UUID:

```sql
update public.profiles set role = 'control_room_admin' where id = 'USER_UUID';
update public.profiles set role = 'department_officer' where id = 'USER_UUID';
update public.profiles set role = 'response_team' where id = 'USER_UUID';
update public.profiles set role = 'super_admin' where id = 'USER_UUID';
```

For a response-team account, also insert its UUID into `team_members` for the appropriate demo team.

## 5. Final end-to-end test

1. Sign in as a citizen and submit a uniquely worded complaint.
2. Confirm a summary, urgency, case number, and timeline appear.
3. Upload an allowed image or audio file smaller than 50 MB.
4. Sign in as the correct staff role and confirm only the allowed track is visible.
5. Accept or assign the case and confirm an audit action appears.
6. Return to the citizen app and confirm the notification indicator updates without refreshing.
7. Open the notification and confirm it opens the correct case.
8. Generate documents through the protected document endpoint and confirm the returned file link expires.
9. Submit identical text again within 24 hours and confirm Haven rejects it as a duplicate.
10. Temporarily remove `GEMINI_API_KEY`, restart the API, and submit different text. Confirm the safe fallback marks AI failure and sets urgency to at least high.

## 6. Optional free deployment

`render.yaml` defines the API service. Add all server variables in Render and set production `CORS_ORIGINS` to the two exact frontend URLs. Keep `TRUST_PROXY=true` on Render.

For Vercel, create two projects from the same repository:

- Citizen build command: `pnpm --filter @haven/citizen build`; output: `apps/citizen/dist`.
- Admin build command: `pnpm --filter @haven/admin build`; output: `apps/admin/dist`.

Set each frontend's `VITE_API_URL` to the deployed API URL and add both deployed frontend origins to the API's `CORS_ORIGINS`.

## Project boundaries

Haven is a university demonstration, not a live dispatch service. It has in-app Realtime notifications; email, SMS, phone OTP, real authority integrations, automatic retention deletion, and verified legal publication remain optional operational work. Qualified people must verify emergency contacts, playbooks, legal entries, and deployment policies before real-world use.
