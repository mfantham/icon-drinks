# AGENTS

This document keeps agents aligned with the Cruise Bar Golf Tracker repository. Use it for onboarding, scripting, and styling guidance so every automated operator can jump into meaningful work without guessing what matters.

## Getting Ready

- Confirm your Node.js version matches the Next.js 15.1 expectations (Node 20.x is recommended). If you hit native build issues, rerun `yarn install --check-files`.
- Run `yarn install` (the project is locked to `yarn@1.22.22`).
- Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and optional `ADMIN_EMAILS`.
- Keep secrets in `.env.local`; it is gitignored. Use a secrets manager or your shell for machine-level credentials.
- Authentication uses Supabase Google OAuth. Keep callback URLs aligned for local and production environments.
- Profile display names should derive from auth metadata (`given_name`, `name`) with email-prefix fallback.
- Supabase auth cookies are configured for a 14-day `maxAge`; keep Supabase session settings at or above two weeks so browser sessions remain stable.
- Seed the database with the SQL files under `supabase/migrations` and `supabase/rls.sql`. Use `supabase db push` when mirroring production schema before data imports.
- The TSV import script (`scripts/import-drinks.ts`) expects headers `type`, `name`, `drink_id`, `premium`, `description`, and `bar`. Run it from the repo root after loading `.env.local`.
- When debugging environment issues, double-check `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vs. `NEXT_PUBLIC_SUPABASE_URL` pairings in both `.env.local` and your hosting platform.

## Build / Lint / Test Commands

- `yarn dev` – run `next dev` with server actions and fast refresh; use it for everyday feature work.
- `yarn build` – run `next build` to compile routes, server components, and static paths.
- `yarn start` – serve the production build locally for smoke tests.
- `yarn lint` – run `next lint`; execute this before pushing to catch syntax, import, and Tailwind issues.
- `yarn import:drinks <path/to/drinks.tsv> [--clear]` – import drinks via the Supabase admin client. Add `--clear` to delete the relevant tables first.

### Running a Single Test

- There are no automated tests yet. When you add them, wrap your runner (Jest, Vitest, etc.) with a `yarn test` script.
- For targeted validation, run the runner’s single-file flag: `yarn vitest run tests/DrinkList.spec.tsx` or `yarn jest --runInBand src/app/page.spec.tsx`. Keep the environment consistent (`--env=jsdom`).
- Favor deterministic options (`--runInBand`, `--maxWorkers=2`) and ensure the runner respects `tsconfig.json` path aliases or uses `ts-node/register`.
- Document any new testing strategy inside this AGENTS file so future agents know the preferred commands.

## Architectural Notes

- Next.js 15.1 with the App Router powers the experience. Files default to server components; add `"use client"` only when you need DOM APIs or hooks.
- Authentication helpers live in `lib/auth.ts`. Always call `requireUser()` in server actions that mutate data and run `ensureProfile()` before touching `profiles`.
- Supabase clients are split between `lib/supabase/admin.ts` (service role) and `lib/supabase/server.ts` (user-scoped). Import those factories rather than instantiating ad-hoc clients.
- UI primitives sit in `components/ui/*`. Reuse them straight away; they merge `className`s with the `cn()` helper to keep Tailwind predictable.
- Fixtures in `data/` mirror Supabase tables. Keep them in sync so design mockups reflect real data.
- The codebase favors composable components. When adding new sections, check `components/ui/` for existing cards, grids, or badges before creating duplicates.
- Layout helpers (`Card`, `Button`, `Badge`, `Input`) expose a minimal API. Keep them light to stay reusable and consistent across route handlers.

## Imports & Resolution

- Always prefer absolute aliases (`@/app`, `@/components`, `@/lib`). Use relative paths only for tight-knit siblings.
- Import order: Node built-ins (`fs`, `path`), external packages (`next`, `react`, `clsx`), then project aliases (`@/lib`, `@/components`).
- Use `import type` for type-only dependencies (e.g., `import type { User } from "@supabase/supabase-js"`). Keep re-exports logical when mixing runtime with types.

## Formatting & Tailwind

- Let Tailwind class lists flow logically (layout → spacing → typography → state/color). When conditional classes multiply, build arrays or helper functions to keep JSX tidy.
- Merge `className`s through `lib/utils.ts` (`cn`). This avoids conflicting responsive/state classes thanks to `tailwind-merge`.
- Maintain consistent indentation (two spaces). Wrap long prop lists in parentheses and break multi-line attributes for clarity.
- Define new colors/shadows inside `tailwind.config.ts` so the palette stays centralized.
- Motion should serve a clear purpose: entry fades, meaningful state changes, or live updates. Favor `motion-safe` for users who prefer reduced motion.
- Responsive grids should realign at Tailwind breakpoints (`md`, `lg`). Avoid fixed widths; rely on `grid-cols` and `gap` utilities.
- Use the `container` helper plus `max-w-4xl`, `mx-auto`, and `gap` classes to align with the curated layout rhythm.
- Merge responsive state classes carefully so `hover:bg-secondary` and `md:hover:bg-secondary` do not conflict; `cn()` handles de-duplication when used consistently.
- Link spacing to the design system. When you need new spacing increments, add them to `tailwind.config.ts` so a single change cascades everywhere.

## Frontend Design Intent

- Typography should feel intentional. Avoid default stacks like Inter, Roboto, Arial, or system fonts unless they already match the theme. Pair a strong display face with a readable body face.
- Backgrounds should leverage gradients, muted textures, or layered tonalities instead of flat solids.
- Colors must support high contrast and avoid purple-on-white clichés. Define any new hues or tokens in Tailwind for reuse.
- Motion should point to intent—page transitions, leaderboard updates, or form feedback. Keep durations between 200–400ms and include `prefers-reduced-motion` fallbacks.
- Layouts must reflow gracefully across `sm`, `md`, `lg`. Test major sections at those breakpoints and ensure cards stack organically.
- Document intentional visual departures (new hero, palette shift, unique animation) in this AGENTS file so downstream agents know the rationale.
- Use atmospheric touches (subtle gradients, soft glow accents, or abstract shapes) sparingly to guide attention without overwhelming data.
- Balance detail with clarity: thin lines, purposeful spacing, and deliberate typography choices make premium experiences feel grounded.

## TypeScript & Naming

- Model props and responses with `type` aliases. Extend native interfaces when wrapping DOM elements (`React.ButtonHTMLAttributes<HTMLButtonElement>`).
- Keep helper predicates local when possible (`isUuid` lives in `app/actions.ts`). They should return `boolean` and avoid side effects.
- Naming: camelCase for variables/functions, PascalCase for components/types. Constants (e.g., `CHUNK_SIZE`) should be uppercase or capitalized.
- Async Supabase interactions should destructure `{ data, error }` and throw early with descriptive messages when `error` exists.
- Replace `any` with discriminated unions when values have multiple shapes. Validate before casting and avoid `as unknown` if possible.
- Favor `readonly` tuples for static lists (`const STEPS = ["one", "two"] as const`) to prevent mutations.
- Add inline JSDoc comments when props or server actions expect specific `FormData` fields so intent stays clear.

## React & Next.js Patterns

- Keep writes inside server actions (`"use server"`). Accept `FormData` directly from `<form action={...}>` elements.
- Use `<Link>` for navigation and wrap button-like links within forms or cards (see `components/site-header.tsx`).
- Client components require `"use client"`. Only import hooks (`useState`, `useEffect`, `useTransition`) after adding the directive.
- Always provide stable keys (`key={drink.id}`) when rendering lists.

## Error Handling & Logging

- Validate inputs early. `logDrinkAction` illustrates calling `isUuid` before altering the database.
- After Supabase calls, inspect `error` and throw `new Error(... ${error.message})` so surfaced logs explain the failure.
- When scripts catch errors, `console.error` before setting `process.exitCode = 1` so calling processes detect the failure.

## Environment & Secrets

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and your deployment environment.
- Keep `SUPABASE_SERVICE_ROLE_KEY` confidential; it is required for the import script and elevated server actions.
- Optional `ADMIN_EMAILS` enables admin-only behaviors; update it per environment when you need additional tooling.

## Data Import Script Notes

- `scripts/import-drinks.ts` uses `tsx`, `csv-parse/sync`, and an admin Supabase client to normalize TSV rows and upsert drinks.
- The script splits inserts into `CHUNK_SIZE` slices (default 1,000). Only adjust this value after validating Supabase capacity.
- Running `yarn import:drinks path/to/drinks.tsv --clear` deletes the relevant tables before importing. Without `--clear`, it just upserts.
- Logs (`[1/7]`, `[2/7]`, etc.) provide checkpoints; keep them so manual observers can follow progress.
- Monitor the console for skipped rows (missing required fields) and correct the TSV source accordingly.

## Naming & Module Structure

- Helpers belong in `lib/*`; primitives belong in `components/ui/*`. Larger patterns (charts, dashboards) reside under `components/`.
- Keep route files in `app/`. Shared layouts or sections can move to `components` or `app/(shared)` to avoid duplication.
- Each file’s default export should be the primary entity (`app/page.tsx`, `components/ui/button.tsx`). Use named exports for helpers or variants.

## Supabase Patterns

- Always include the authenticated user’s ID (`user_id`) in mutations. Never trust client-supplied IDs alone.
- Keep RLS policies (defined in `supabase/rls.sql`) aligned with helpers in `lib/auth.ts`.
- After actions mutate data, `revalidatePath("/drinks")`, `/dashboard`, and other affected routes so cached UIs refresh.
- Mirror schema changes in `supabase/migrations`. Add migrations for new or renamed tables/columns.

## Security & Compliance

- Avoid logging secrets or service role tokens; keep logs descriptive but credential-free.
- Minimize trusted storage; prefer the Supabase auth token and do not persist additional identifiers unless necessary.
- Document RLS or schema changes in this file so future agents understand how enforcement works.
- Gate new admin tooling behind verified `ADMIN_EMAILS` and describe its usage here.

## Scripts & Tooling

- The import script uses `tsx` so you can run TypeScript directly. Always install dependencies before executing scripts.
- Scripts live in `scripts/` to keep route files clean. New helpers should be TypeScript files callable via `yarn <script>`.
- The script loads environment variables with `@next/env`. Run it from the project root to pick up `.env.local`.

## Accessibility & UX

- Use semantic HTML (`<header>`, `<main>`, `<section>`). Buttons should declare `type` attributes (`type="submit"`).
- Keep focus states visible with Tailwind `ring` utilities. Don’t remove outlines without providing alternative indicators.
- Supply `aria-label`s or `sr-only` text for icon buttons and non-text controls.
- Ensure text meets WCAG AA contrast ratios. Use Lighthouse or aXe when adding new palettes.
- Keyboard navigation must work for dropdowns, modals, and interactive lists. Test using `Tab`, `Shift+Tab`, and `Enter`.
- Document accessibility trade-offs in this file so future agents understand why deviations exist.

## Collaboration Guidelines for Agents

- Always inspect `git status` before starting; other agents may have left dirty state.
- Document any new conventions (scripts, tokens, design patterns) in this AGENTS file so it remains the canonical handbook.
- Mention manual steps (migrations, imports, env updates) in your response and in this file when you finish work.
- There are no Cursor or Copilot rules in this repo; if you add them later, include them here for other agents.
