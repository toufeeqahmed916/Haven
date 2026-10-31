# Deploy Haven on Vercel

Haven uses three Vercel projects connected to the same GitHub repository:

1. `haven-citizen` builds `apps/citizen`.
2. `haven-admin` builds `apps/admin`.
3. `haven-api` runs the existing Express API as a Vercel Function from `apps/api/index.ts`.

The Vercel Hobby plan is suitable for a personal, non-commercial university demonstration. Review Vercel's current plan limits and terms before using it for any other purpose.

## Before deploying

Commit and push the project to GitHub. From PowerShell in the Haven folder:

```powershell
git status --short
git add .gitignore README.md vercel.json apps/api/index.ts apps/api/vercel.json apps/api/tsconfig.json docs/VERCEL_DEPLOYMENT.md
git commit -m "Prepare Haven for Vercel deployment"
git push origin main
```

Do not commit `.env`. Haven's `.gitignore` excludes it. Keep `SUPABASE_SECRET_KEY` and `GEMINI_API_KEY` private in Vercel's API project settings.

## Create the API project

1. In Vercel, select **Add New → Project**, import `toufeeqahmed916/Haven`, and select the `main` branch.
2. Set **Root Directory** to `apps/api`.
3. Enable **Include source files outside of the Root Directory in the Build Step** so the workspace lockfile and root configuration are available.
4. Keep the detected pnpm package manager and automatic Express build settings. If you need to enter commands manually, use `pnpm install --frozen-lockfile` for Install Command and `pnpm run build` for Build Command.
5. Set the Node.js version to **24.x**.
6. Add these Production environment variables (and Preview too if you will use preview deployments):

   | Name | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_ANON_KEY` | Your Supabase anon/publishable key |
   | `SUPABASE_SECRET_KEY` | Your Supabase secret key (`sb_secret_...`) |
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
   | `AI_TIMEOUT_MS` | `12000` |
   | `RATE_LIMIT_MAX` | `300` |
   | `TRUST_PROXY` | `true` |
   | `CORS_ORIGINS` | Fill in after creating both frontends (step 4) |

7. Deploy. Copy the API deployment's production URL. The health endpoint is `<API_URL>/health`.

## Create the citizen project

Import the same repository into a second Vercel project. Set **Root Directory** to `.` (the repository root), Framework Preset to **Other**, and configure:

| Setting | Value |
| --- | --- |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm --filter @haven/citizen build` |
| Output Directory | `apps/citizen/dist` |

Add Production (and optionally Preview) environment variables:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/publishable key |
| `VITE_API_URL` | The API project's production URL, with no trailing slash |

Deploy and copy the citizen site's production URL.

## Create the admin project

Import the same repository into a third Vercel project. Use the same root directory and Framework Preset as the citizen project, with these build settings:

| Setting | Value |
| --- | --- |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm --filter @haven/admin build` |
| Output Directory | `apps/admin/dist` |

Add the same three `VITE_*` environment variables, using the same API URL, then deploy and copy the admin site's production URL.

## Finish API CORS and Supabase Auth configuration

1. In the API project's Vercel settings, set `CORS_ORIGINS` to the two production site origins separated by a comma, without trailing slashes:

   ```text
   https://your-citizen-project.vercel.app,https://your-admin-project.vercel.app
   ```

2. Redeploy the API after saving the variable.
3. In Supabase, go to **Authentication → URL Configuration**. Set **Site URL** to the citizen site's production URL and add that URL plus `https://your-citizen-project.vercel.app/**` under **Redirect URLs**.
4. If using a custom domain, update `CORS_ORIGINS`, Supabase redirect URLs, and the appropriate Vercel project domains to use it.

## Smoke check

- Open `<API_URL>/health`; the response should show `status: "ok"` and configured protected commands/AI when those keys are set.
- Open the citizen site and test sign-in, a demo complaint, and voice intake.
- Open the admin site and sign in with an account that has a staff role.
- Open a direct route such as `/app` or `/login` in a fresh tab. The repository's root `vercel.json` provides the SPA fallback.

Vercel Functions are serverless, so in-memory rate-limit counters are per running function instance and are not a persistent global quota. The Haven rate limiter remains useful as a basic demo safeguard; use a shared store if the project later needs globally consistent production rate limits.
