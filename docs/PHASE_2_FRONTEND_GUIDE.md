# Phase 2 - Frontend guide

This guide tracks the frontend in eight steps. All eight implementation steps are complete. Automated and browser testing were intentionally not run at the project owner's request; use the manual checklist below.

## Completed: Step 1 - Monorepo UI applications

The project now uses a pnpm workspace:

```text
apps/
  citizen/          React + Vite + TypeScript, port 5173
  admin/            React + Vite + TypeScript, port 5174
packages/
  shared/           Haven components and shared styles
```

Root commands:

```powershell
pnpm install
pnpm dev:citizen
pnpm dev:admin
pnpm typecheck
pnpm build
```

If pnpm asks whether `esbuild` may run its installation script, allow it. The workspace configuration already lists `esbuild` under `onlyBuiltDependencies`.

Use two terminals if both applications need to run at the same time.

Public Supabase values belong in a local `.env` copied from `.env.example`. Never put the service-role key in either frontend application.

## Completed: Step 2 - Shared Haven design system

`@haven/shared` contains:

- exact brand colors from the supplied HTML;
- Plus Jakarta Sans, DM Mono, and Noto Nastaliq Urdu typography;
- the 1240px container and the original 900px/540px responsive breakpoints;
- reusable Brand, Header, Button, Card, Eyebrow, Field, Select, Textarea, StatusBadge, and EmergencyCallButton components;
- shared focus, hover, disabled, validation, RTL, and reduced-motion behavior;
- spacing, radii, shadows, typography, and color design tokens.

Both applications import one stylesheet:

```ts
import "@haven/shared/styles.css";
```

The small screens currently visible in each app are component showcases, not the finished citizen landing page or admin dashboard.

## Completed: Step 3 - Supplied landing page rebuilt in React

The citizen home route (`/`) now reproduces the supplied HTML as React while preserving:

- the original forest, leaf, paper, sage, sand, and coral visual language;
- the curved hero, supplied Unsplash images, floating notes, content cards, language phones, legal-information block, accountability section, guides, privacy block, FAQ, CTA, footer, and emergency button;
- the 900px and 540px responsive layouts;
- working FAQ, report modal, Escape/backdrop close behavior, guide notices, and accessible labels;
- a local report draft handoff to signup. No report is submitted before authentication.

The source is `apps/citizen/src/pages/LandingPage.tsx` with styles in `apps/citizen/src/landing.css`.

## Completed: Step 4 - Authentication and protected routes

Citizen routes:

- `/login` - email/password login;
- `/signup` - account creation, preferred language, optional later-ready phone field, and safety acknowledgement;
- `/app` - protected citizen home;
- `/settings` - protected name/language settings.

Admin routes:

- `/login` - staff login;
- `/` - protected control-room foundation with a database role check. Only `control_room_admin`, `department_officer`, `response_team`, and `super_admin` roles pass.

### Connect Supabase

Create `C:\Users\Admin\Desktop\Haven\.env` from `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Use only the public anon key. Never put the service-role key in this file.

In Supabase Dashboard:

1. Open **Authentication > Providers > Email** and enable Email.
2. For easiest university testing, either disable **Confirm email** or keep it enabled and use a real inbox.
3. Open **Authentication > URL Configuration**.
4. Set the Site URL to `http://127.0.0.1:5173`.
5. Add `http://127.0.0.1:5173/app` to Redirect URLs.
6. Create staff accounts and assign their roles using the SQL instructions from Phase 1.

Phone is collected only as future-ready metadata. Phone OTP remains disabled because an SMS provider is required.

## Completed: Step 5 - Citizen complaint flow

The protected `/report` route now provides a four-part complaint experience that matches the supplied Haven visual system:

- plain-language incident description and up to five private evidence files;
- category selection, typed area, optional browser location, and incident time;
- named or anonymous-to-general-staff privacy selection;
- final review and accuracy confirmation before submission;
- browser draft saving so unfinished text is not lost on refresh;
- a clearly separated danger shortcut that submits for high-priority human review without pretending to replace Police 15.

Submission uses the Phase 1 `submit_complaint` database function. Evidence is uploaded to the private `complaint-media` bucket and registered in the `attachments` table. The frontend never uses a service-role key.

## Completed: Step 6 - Citizen results and case tracking

Protected tracking routes are now available:

- `/cases` lists the signed-in citizen's reports with case number, urgency, status, and submission time;
- `/case/<complaint-uuid>` shows the current status, live timeline, assignment and ETA, report details, private evidence, prepared documents, approved safety guidance, and verified legal information;
- Supabase Realtime refreshes the case list and case details when complaint or status records change;
- private evidence and generated documents use short-lived signed links;
- unapproved safety playbooks and unverified legal content are deliberately hidden rather than guessed.

The report, cases, case detail, settings, and signed-in home screens share one responsive citizen navigation shell and the same colors, spacing, cards, typography, and 900px/540px breakpoints as the original UI.

### Manual testing links

Start the citizen app with `pnpm dev:citizen`, then open:

- `http://127.0.0.1:5173/report`
- `http://127.0.0.1:5173/cases`

Opening a report from **My cases** takes you to its protected detail link. These screens require the Phase 1 migrations, Supabase environment values, and a signed-in citizen account.

## Completed: Step 7 - Admin control room

The admin application on port `5174` now includes:

- a live, role-authorized priority queue ordered by final urgency and waiting time;
- case search plus track and status filters;
- queue totals for active, critical, awaiting-review, and on-the-way cases;
- protected case review with the original statement, location, rule/AI/final urgency comparison, danger flags, private evidence, timeline, assignment history, and audit history;
- decision forms for accept, reject, request information, and team assignment;
- a safety-playbook and legal-information content library with approval/verification states;
- responsive desktop, tablet, and mobile layouts matching the Haven visual system.

Supabase RLS controls which cases each staff role can read. Privileged decisions are not written directly from the browser. The buttons use the Phase 3 protected endpoint contract when `VITE_API_URL` is configured:

```text
POST {VITE_API_URL}/api/v1/admin/complaints/:complaintId/actions
Authorization: Bearer <Supabase access token>
```

Until that API exists, decision buttons remain safely disabled and explain why.

## Completed: Step 8 - Frontend polish and manual QA handoff

The final source pass adds:

- responsive layouts at the original 900px and 540px breakpoints;
- loading, empty, error, unauthorized, and configuration states;
- skip links, semantic landmarks, labels, visible keyboard focus, and reduced-motion support;
- English page titles and automatic Urdu/Sindhi RTL direction from the citizen's language preference;
- localized signed-in navigation labels for English, Urdu, and Sindhi;
- short-lived signed links for protected evidence and documents;
- consistent Haven typography, colors, cards, rounded geometry, and safety wording across both applications.

### Manual frontend checklist

1. Start the citizen app with `pnpm dev:citizen` and the admin app in another terminal with `pnpm dev:admin`.
2. At `http://127.0.0.1:5173`, create/sign in as a citizen, submit a civic case and a safety case, and confirm both appear under **My cases**.
3. Refresh during an unfinished report and confirm the browser draft returns.
4. Confirm evidence opens only while signed in and only through a short-lived link.
5. Change language to Urdu and Sindhi and confirm the signed-in shell changes to RTL and its navigation labels change.
6. At `http://127.0.0.1:5174/login`, sign in with each demo staff role and confirm each sees only the queue allowed by RLS.
7. Open a queue row and review its statement, urgency comparison, evidence, timeline, assignment, and audit panels.
8. Open `/content` and confirm ordinary staff see only approved/verified content while a Super Admin can see review-state records.
9. Check both apps at desktop, tablet, and mobile widths and operate forms using the keyboard.
10. After Phase 3 supplies `VITE_API_URL`, test accept, reject, request-information, and assignment commands and verify the database audit records.

## Phase 2 result

The citizen frontend and staff control room are implementation-complete. The project owner will perform the requested browser and device testing manually before Phase 3 begins.

The unchanged visual reference remains at `docs/reference/haven-ui-reference.html` for visual comparison.
