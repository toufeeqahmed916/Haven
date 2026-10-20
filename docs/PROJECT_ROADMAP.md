# Haven project roadmap

This roadmap keeps the build understandable for a university team while still following strong privacy and safety practices. Each phase has eight small milestones and a clear finish condition.

## Phase 1 - Database (Supabase)

1. **Create the Supabase project** - choose the nearest region, save the project URL, and keep service keys private.
2. **Create the core schema** - install enums, profiles, categories, complaints, and workflow tables.
3. **Add automatic database behavior** - create user profiles, timestamps, case status history, and audit records.
4. **Apply Row Level Security** - citizens see their cases; staff only see cases allowed by their role.
5. **Create private file storage** - keep complaint media and generated documents out of public buckets.
6. **Load safe starter data** - categories plus clearly marked demo playbooks and teams; do not publish unverified legal claims.
7. **Create demo users and assign roles** - citizen, control-room admin, department officer, response team, and super admin.
8. **Run verification checks** - confirm tables, policies, storage buckets, access boundaries, and realtime publication.

**Done when:** a citizen can submit a complaint safely, see only their own case and timeline, and an authorized role can access only the correct case track.

## Phase 2 - Frontend (React + Vite)

The supplied HTML is the visual source of truth. Preserve its colors, typography, spacing, rounded shapes, landing-page sections, mobile behavior, and safety wording while converting it into maintainable React components.

1. **Create the monorepo UI apps** - `apps/citizen`, `apps/admin`, and `packages/shared` using pnpm, TypeScript, and Vite.
2. **Build the shared design system** - exact Haven color tokens, fonts, buttons, cards, form controls, navigation, and responsive breakpoints.
3. **Rebuild the landing page exactly** - componentize the supplied UI without visually redesigning it.
4. **Add authentication screens** - free email login for the demo, protected routes, language setting, and later-ready phone field.
5. **Build the citizen complaint flow** - type/photo input, category, location, privacy, review, submit, and emergency shortcut.
6. **Build citizen results and tracking** - safety cards, legal disclaimer, documents, case status timeline, and “My cases.”
7. **Build the admin dashboard** - priority queue, case detail, accept/reject/request-info actions, assignment, and content screens.
8. **Polish and test** - responsive layout, English/Urdu/Sindhi direction, accessibility, empty/error/loading states, and UI screenshot comparison.

**Done when:** the UI looks the same as the supplied HTML, works on mobile and desktop, and reads/writes only through approved Supabase/API paths.

## Phase 3 - Backend (Node.js + Express)

1. **Create the TypeScript API** - Express, Zod validation, environment configuration, health check, and consistent errors.
2. **Add auth and role guards** - verify Supabase access tokens and enforce the same role boundaries as database RLS.
3. **Implement complaint commands** - submit, edit draft, request info, accept/reject, status transition, reopen, and appeal.
4. **Implement safe analysis** - danger keywords run first; AI can raise urgency but never lower a danger-rule result.
5. **Add AI with a fallback** - transcription, summary, category, and urgency; on failure mark High, require human review, and return approved default steps.
6. **Add private files and documents** - signed uploads/downloads, evidence checklist, complaint/civic application PDFs, and retention metadata.
7. **Add realtime and notifications** - Supabase Realtime first; optional email/SMS later, with no promise of response time.
8. **Test, secure, and deploy** - unit/integration tests, rate limits, duplicate checks, audit review, Render/Railway API, and Vercel frontends.

**Done when:** all sensitive changes go through validated commands, every admin decision is logged, AI failure is safe, and the demo works end to end.

## Scope rule for the university version

Build a reliable demo, not a real emergency dispatch service. Use sample teams, clearly label estimates, keep legal entries unpublished until reviewed, and never claim that a submitted report guarantees police or rescue response.
