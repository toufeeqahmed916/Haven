# Haven

Haven is a university project for citizen safety and civic complaint reporting. The product helps a citizen describe a problem, receive reviewed safety guidance, and follow a complaint while a human control-room operator makes the final urgency and dispatch decisions.

## Simple Windows setup

1. Copy `.env.example` to `.env` and add the Supabase Project URL and public anon/publishable key.
2. Double-click `setup-haven.cmd` once.
3. Double-click `start-citizen.cmd` for `http://127.0.0.1:5173`.
4. Double-click `start-admin.cmd` for `http://127.0.0.1:5174/login`.

These launchers do not require pnpm to be available in PowerShell PATH. See [docs/RUN_HAVEN_WINDOWS.md](docs/RUN_HAVEN_WINDOWS.md) for the exact `.env` format and troubleshooting notes.

> Safety boundary: Haven is not an emergency service. Emergency actions and legal content must be verified by qualified local partners before any real deployment.

## Project phases

| Phase | Goal | Current state |
| --- | --- | --- |
| 1. Database | Supabase schema, roles, privacy rules, storage, seed data, and checks | Ready to install |
| 2. Frontend | Citizen PWA and admin dashboard matching the supplied Haven UI | Steps 1-8 implemented; manual QA pending |
| 3. Backend | API, safe urgency rules, AI integration, notifications, and documents | Steps 1-8 complete; final manual Supabase/browser QA pending |

Start with [docs/PHASE_1_SUPABASE_GUIDE.md](docs/PHASE_1_SUPABASE_GUIDE.md). The complete step-by-step roadmap is in [docs/PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md).

Frontend setup and commands are documented in [docs/PHASE_2_FRONTEND_GUIDE.md](docs/PHASE_2_FRONTEND_GUIDE.md).

Backend setup, authentication, role guards, and API endpoints are documented in [docs/PHASE_3_BACKEND_GUIDE.md](docs/PHASE_3_BACKEND_GUIDE.md).

The final keys, migration, run, test, and deployment sequence is in [docs/FINAL_SETUP_CHECKLIST.md](docs/FINAL_SETUP_CHECKLIST.md).

## Repository layout

```text
haven/
  apps/                 # Phase 2 and 3 application code
    citizen/             # Citizen React application
    admin/               # Control-room React application
  packages/
    shared/              # Haven design system and shared UI
  docs/
    reference/          # Original UI and project documents
    PHASE_1_SUPABASE_GUIDE.md
    PROJECT_ROADMAP.md
  supabase/
    migrations/         # Run in filename order
    seed.sql             # Optional demo content
    smoke_test.sql       # Safe checks; rolls back its test data
```

## Phase 1 result

The database supports:

- citizens, control-room admins, response teams, department officers, and super admins;
- safety and civic complaint categories;
- text complaints, private attachments, language, location, privacy choice, danger flags, and human review;
- approved safety playbooks and verified legal content;
- assignments, ETA, live status history, documents, admin actions, appeals, and audit logs;
- Row Level Security so citizens only see their own information and staff access is limited by role;
- private `complaint-media` and `generated-documents` storage buckets.

## Free demo choices

- Supabase Free plan for Postgres, Auth, Storage, and Realtime.
- Email/password authentication during the university demo.
- Leaflet and OpenStreetMap in Phase 2.
- Optional Gemini free quota in Phase 3, with deterministic fallback rules.

Phone OTP is not fully free because an SMS provider is required. It is deliberately postponed to Phase 3.
