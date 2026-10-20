# Run Haven on Windows

## 1. Create the environment file

In `C:\Users\Admin\Desktop\Haven`, copy `.env.example` and rename the copy to `.env`.

Open `.env` in Notepad and set these values:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_API_URL=http://127.0.0.1:4000
SUPABASE_SECRET_KEY=YOUR_SB_SECRET_KEY
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
AI_TIMEOUT_MS=12000
```

Find both values in Supabase under **Project Settings > API**:

- **Project URL** goes in `VITE_SUPABASE_URL`.
- **anon public** or **Publishable key** goes in `VITE_SUPABASE_ANON_KEY`.
- Keep `VITE_API_URL=http://127.0.0.1:4000` and add a current `sb_secret_...` server key as `SUPABASE_SECRET_KEY` in `.env`. The legacy service-role variable remains supported as a fallback.
- `GEMINI_API_KEY` is optional. Leave it blank to use the safe human-review fallback.

Never put the service-role or Gemini key in `.env.example`, frontend source code, or any variable beginning with `VITE_`. The root `.env` is ignored by Git and the API can read its unprefixed server-only values.

## 2. Install dependencies

Double-click `setup-haven.cmd` once. It finds the available pnpm executable automatically.

## 3. Start the API

Double-click `start-api.cmd` and keep its black window open. The API uses `http://127.0.0.1:4000`.

## 4. Start the citizen website

Double-click `start-citizen.cmd`, keep the black window open, and visit:

`http://127.0.0.1:5173`

## 5. Start the admin dashboard

Double-click `start-admin.cmd`, keep the second black window open, and visit:

`http://127.0.0.1:5174/login`

The launchers call Vite directly and do not require `pnpm` to be available in PowerShell PATH.
