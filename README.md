# Bar Golf Cruise Drinks Tracker

Next.js (App Router) + TypeScript app for tracking cruise drinks across bars, with Supabase Auth, Supabase Postgres, Recharts dashboard stats, and a TSV import script.

## Stack

- Framework: Next.js (App Router) + TypeScript
- UI: Tailwind + shadcn/ui-style components
- Charts: Recharts
- Database: Supabase Postgres
- Auth: Supabase Auth (Facebook + email magic link fallback)
- Deploy target: Vercel
- Package manager: Yarn

## Project Structure

- `/Users/marcusfantham/dev/icon-drinks/app/`
  - `/` landing
  - `/login` sign-in
  - `/drinks` drinks browser + log action
  - `/dashboard` stats/charts
  - `/my-logs` user logs + delete action
  - `/auth/callback` OAuth/magic-link callback
- `/Users/marcusfantham/dev/icon-drinks/scripts/import-drinks.ts`
- `/Users/marcusfantham/dev/icon-drinks/supabase/migrations/202602210001_init.sql`
- `/Users/marcusfantham/dev/icon-drinks/supabase/rls.sql`

## 1) Create Supabase Project

1. Go to [Supabase](https://supabase.com/) and create a new project.
2. In `Project Settings -> API`, copy:
   - Project URL
   - Publishable key
   - Service role key (only needed for import/admin scripts)

## 2) Configure Auth Providers

### Facebook provider in Supabase

1. Open `Authentication -> Providers -> Facebook` in Supabase.
2. Enable the provider.
3. Enter your Facebook App ID and App Secret from Meta Developers.
4. Set site URL to your app URL.

### Callback URLs in Meta (Facebook app)

Set valid OAuth redirect URI(s):

- Local: `http://localhost:3000/auth/callback`
- Production: `https://<your-vercel-domain>/auth/callback`

### Email magic link fallback

In Supabase `Authentication -> Providers -> Email`, enable magic link sign-in.

## 3) Environment Variables

Copy env template:

```bash
cp /Users/marcusfantham/dev/icon-drinks/.env.example /Users/marcusfantham/dev/icon-drinks/.env.local
```

Set values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (only needed for TSV import script)
- `ADMIN_EMAILS` (optional app-level list)

Note: legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still supported as fallback in code.

For Vercel, add the same env vars in `Project Settings -> Environment Variables`.

## 4) Install Dependencies

```bash
cd /Users/marcusfantham/dev/icon-drinks
yarn install
```

## 5) Create Database Schema

Run SQL from:

- `/Users/marcusfantham/dev/icon-drinks/supabase/migrations/202602210001_init.sql`

Use Supabase SQL Editor and execute the file contents.

## 6) Apply RLS Policies

Run SQL from:

- `/Users/marcusfantham/dev/icon-drinks/supabase/rls.sql`

This enables:

- Public read access to drinks catalog (`bars`, `drink_types`, `drinks`, `drink_availability`)
- Authenticated read of all logs
- Insert/delete only own `drink_logs`
- Own-row insert/update for `profiles`

## 7) Import Initial Drinks From TSV

Expected TSV columns:

- `Type`
- `Name`
- `DRINK_ID`
- `Premium`
- `Description`
- `Bar`

Run import:

```bash
yarn import:drinks ./data/drinks.tsv
yarn import:drinks ./data/drinks.tsv --clear
```

Import behavior:

- Normalizes to `bars`, `drink_types`, `drinks`, `drink_availability`
- Uses `DRINK_ID` as `drink_key` for idempotent upserts
- Idempotent upserts (safe to re-run)

## 8) Local Development

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## 9) Deploy to Vercel

1. Push repo to GitHub.
2. Import project into [Vercel](https://vercel.com/).
3. Add env vars.
4. Deploy.
5. In Supabase SQL Editor (prod project), run:
   - `/Users/marcusfantham/dev/icon-drinks/supabase/migrations/202602210001_init.sql`
   - `/Users/marcusfantham/dev/icon-drinks/supabase/rls.sql`
6. Import production TSV:

```bash
yarn import:drinks ./data/drinks.tsv
```

## Commands Reference

```bash
yarn dev
yarn build
yarn start
yarn lint
yarn import:drinks <path-to-tsv> [--clear]
```
