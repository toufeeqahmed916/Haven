# Phase 3 backend guide

Steps 1 through 8 are implemented in `apps/api`.

## Step 1 - TypeScript API foundation

The API includes:

- Node.js, Express 5, and strict TypeScript;
- Zod environment and route validation;
- Helmet security headers and an explicit CORS allowlist;
- a 1 MB JSON-body limit;
- request IDs on every response;
- one consistent JSON error format;
- health and API-information endpoints;
- graceful shutdown and production compilation.

Error responses use this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request data is invalid.",
    "details": []
  },
  "requestId": "request-uuid"
}
```

## Step 2 - Authentication and role guards

Protected endpoints require this header:

```text
Authorization: Bearer <Supabase access token>
```

The API asks Supabase Auth to verify the token, creates a user-scoped Supabase client, reads the user's profile through RLS, and rejects missing, expired, malformed, or inactive accounts.

Role rules mirror Phase 1:

| Role | API boundary |
| --- | --- |
| citizen | Citizen-owned resources only through RLS and future ownership guards |
| control_room_admin | Safety track |
| department_officer | Civic track |
| response_team | Only actively assigned cases; every status command checks active team membership |
| super_admin | Safety and civic tracks |

The service-role key is not used for login or role verification. It is used only after authentication, validation, and authorization for the atomic Step 3 database commands.

## Step 3 - Complaint commands and status transitions

The citizen API supports creating and updating a draft, submitting it, reopening an eligible case, and filing an appeal. The staff API supports accepting, requesting more information, rejecting, assigning a suitable team, and moving an assigned case through its allowed statuses.

Sensitive writes are performed by service-role-only Postgres functions in `supabase/migrations/005_backend_commands.sql`. Each command checks the actor and current case state inside the same database transaction, then writes the complaint change, citizen-visible status update, admin action, and audit record together.

Important transition rules include:

| Command | Allowed condition | Result |
| --- | --- | --- |
| Submit | Owner's draft | `submitted` |
| Accept | Submitted, under review, or reopened | `accepted` |
| Request information | Submitted, under review, or reopened; note required | `under_review` |
| Reject | Submitted, under review, or reopened; reason required | `rejected` |
| Assign | Reviewable or accepted case; suitable non-offline team and ETA required | `team_assigned` |
| Team progress | Active assignment and allowed current state | `on_the_way`, `arrived`, then `closed` |
| Reopen | Owner's closed or rejected case, within 7 days | `reopened` |

Response-team accounts can update only complaints to which their team has an active assignment. Civic cases can only be assigned to civic departments; safety cases can only be assigned to response, police-referral, or medical-referral teams.

## Step 4 - Deterministic safety analysis

Before a complaint is saved, the API normalizes the title and description and applies transparent keyword rules in English, Urdu, and Sindhi. It returns:

- `urgency`: low, medium, high, or critical;
- matched rule identifiers;
- plain-language reasons;
- whether a human must review the result.

Safety complaints always have at least medium urgency. Clear immediate-danger, weapon, medical-emergency, fire, threat, stalking, and civic-hazard signals can raise urgency. The result is stored with `needs_human_review = true`; it never dispatches a team by itself. The exported combination rule also ensures a future AI suggestion may raise urgency but can never lower the deterministic result.

## Step 5 - Optional AI with safe fallback

Gemini can optionally prepare a short summary, English translation when needed, category suggestion, and urgency suggestion. Complaint text is treated as untrusted data. AI never makes dispatch, legal, acceptance, or rejection decisions.

Deterministic rules always run first. AI may raise their urgency but cannot lower it. If the key is missing, a request times out, the provider rejects it, or its JSON fails validation, Haven keeps the citizen's category, creates a local summary, records the failure, raises final urgency to at least `high`, and requires human review. The rest of Haven therefore works without a Gemini key.

## Step 6 - Private files and documents

Evidence uses signed upload permission followed by server confirmation. The server checks the owner, case, storage path, size, and MIME type. Evidence and PDF downloads use audited 60-second links.

The API generates private complaint applications, evidence checklists, civic applications, and factual FIR drafts. These PDFs carry a verification disclaimer; an FIR draft is not an official FIR or legal advice. Attachments and documents receive a one-year `retention_until` review date. Automatic deletion is deliberately postponed.

## Step 7 - Realtime and in-app notifications

Citizen notifications are stored in a private RLS-protected table. Citizen-visible status changes create notifications automatically, assignments notify response-team members, and Supabase Realtime refreshes the notification indicator without a page reload. Email, SMS, and phone OTP remain optional because they require external providers.

## Step 8 - Security, tests, and deployment readiness

The final backend adds IP request limits, rate-limit headers, request/header timeouts, proxy-safe deployment settings, 24-hour exact-duplicate checks, audited private downloads, final database smoke checks, HTTP integration tests, and a free-tier Render API definition.

## Environment file

The root `.env` must contain:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
VITE_API_URL=http://127.0.0.1:4000

NODE_ENV=development
API_HOST=127.0.0.1
API_PORT=4000
CORS_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:5174

SUPABASE_SECRET_KEY=
# Legacy fallback only:
SUPABASE_SERVICE_ROLE_KEY=

# Optional; leave blank to use the safe fallback.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
AI_TIMEOUT_MS=12000
RATE_LIMIT_MAX=300
TRUST_PROXY=false
```

Create or copy a current `sb_secret_...` key from Supabase Dashboard -> Project Settings -> API Keys and place it only in the root `.env` as `SUPABASE_SECRET_KEY`. The API still accepts the legacy service-role variable as a fallback. Never use a `VITE_` prefix, commit it, paste it into frontend code, or share it publicly.

## Supabase setup through Step 8

1. Open Supabase Dashboard -> SQL Editor.
2. Open `supabase/migrations/005_backend_commands.sql` from this project.
3. Copy the whole file into a new SQL query and click **Run** once.
4. Run `supabase/migrations/006_ai_files_documents.sql` once in a new query.
5. Run `supabase/migrations/007_notifications_security.sql` once in a new query.
6. Run `supabase/smoke_test.sql` and confirm its Phase 1-3 success message.
7. Add the real `SUPABASE_SECRET_KEY` and `VITE_API_URL` values shown above to the existing root `.env`.
8. Optionally add a Gemini API key. Leave it blank if you want the safe fallback.
9. Restart the API, citizen app, and admin app so they reload the environment.

Do not rerun migrations `001`-`004` if they were already installed successfully. If you already ran `005`, run `006`, then `007`.

## Run the API on Windows

Double-click `setup-haven.cmd` once after dependency changes. Then double-click `start-api.cmd`.

The API starts at:

```text
http://127.0.0.1:4000
```

Keep the API window open together with the citizen and admin frontend windows.

## Current endpoints

| Method and path | Authentication | Purpose |
| --- | --- | --- |
| `GET /health` | Public | Server status without secrets |
| `GET /api/v1` | Public | API name, version, and safety boundary |
| `GET /api/v1/auth/me` | Any active account | Verified user and Haven profile |
| `GET /api/v1/auth/staff` | Staff only | Staff-role guard check |
| `GET /api/v1/auth/track/safety` | Allowed safety staff | Safety-track guard check |
| `GET /api/v1/auth/track/civic` | Allowed civic staff | Civic-track guard check |
| `POST /api/v1/complaints` | Active citizen | Create a draft or submitted complaint |
| `PATCH /api/v1/complaints/:id/draft` | Draft owner | Edit a draft |
| `POST /api/v1/complaints/:id/submit` | Draft owner | Submit a draft |
| `POST /api/v1/complaints/:id/reopen` | Eligible case owner | Reopen with a reason |
| `POST /api/v1/complaints/:id/appeals` | Complaint owner | File an appeal |
| `POST /api/v1/admin/complaints/:id/actions` | Authorized staff | Accept, reject, request information, or assign |
| `POST /api/v1/admin/complaints/:id/status` | Authorized staff/team | Move through allowed operational statuses |
| `POST /api/v1/files/complaints/:id/attachments/upload-url` | Complaint owner | Create a signed private upload permission |
| `POST /api/v1/files/complaints/:id/attachments/complete` | Complaint owner | Verify and register uploaded evidence |
| `GET /api/v1/files/attachments/:id/download-url` | Authorized case reader | Create an audited 60-second evidence link |
| `POST /api/v1/files/attachments/:id/transcribe` | Authorized case reader | Transcribe audio when AI is configured |
| `POST /api/v1/files/complaints/:id/documents` | Authorized case reader | Generate a private PDF |
| `GET /api/v1/files/documents/:id/download-url` | Authorized case reader | Create an audited 60-second PDF link |

## Verification completed

- strict TypeScript check: passed;
- all 15 role-policy, validation, safety, fallback, upload, PDF, rate-limit, and HTTP integration tests: passed;
- production API build: passed;
- citizen and admin strict TypeScript checks: passed after API integration;
- `GET /health`: returned `200` and `status: ok`;
- protected `/auth/me` without a token: returned `401`.

No browser testing was used.

Phase 3 implementation is complete. Follow `docs/FINAL_SETUP_CHECKLIST.md` for the final Supabase and browser verification.
