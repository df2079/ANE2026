# Art Niche Expo Awards 2026 Voting

Mobile-first MVP voting app built with Next.js App Router, TypeScript, Tailwind, and Supabase.

## Recommended architecture

- `XLSX workbook` stays the content source of truth for brands and perfumes.
- `Supabase Postgres` stores runtime state: voters, votes, admin settings, imports, warnings, audit logs, and derived nominees.
- `Supabase Storage` keeps the uploaded workbook file so admin can upload once and sync later.
- `Derived category_nominees` are rebuilt from imported workbook data plus fixed global excludes.
- `Next.js server actions` handle admin sync, voting end time, results publishing, and vote submission with server-side validation.

## Data model summary

- `brands`: one row per workbook sheet, including imported brand-level metadata.
- `perfumes`: normalized perfumes per brand, with `launched_2026` imported from column B.
- `categories`: the 4 award categories.
- `category_nominees`: derived membership for each category, rebuilt on sync or rules changes.
- `voters`: email-based voter identity with optional device token and newsletter consent.
- `votes`: one row per voter per category, immutable by design.
- `import_logs` and `import_warnings`: workbook history, sync summaries, and validation warnings.
- `admin_settings`: voting window and publish timestamp.
- `vote_attempt_logs`: lightweight audit trail and IP-based abuse throttling.
- `admin_audit_logs`: publish/sync/settings audit trail.

## Assumptions

- Admin login uses Supabase email magic links and a comma-separated `ADMIN_EMAILS` allowlist.
- Public users do not need Supabase auth accounts; they are represented by rows in `voters`.
- Results are public only after an explicit admin publish action.
- Device lock is intentionally soft: it discourages one device from starting fresh with multiple emails, but does not attempt enterprise-grade identity proofing.
- Workbook metadata uses `C1/C2` for `RO Brand` and `D1/D2` for `Launched at Expo 2026`, with tolerant parsing and backward compatibility.

## Reproducible Supabase setup

This repo now supports a Supabase CLI-first workflow.

What is now reproducible by command:
- local Supabase stack startup
- migrations
- default app data
- storage bucket creation
- local auth redirect configuration

What still requires manual action for a hosted Supabase project:
- creating the Supabase project itself
- copying project credentials into `.env.local`
- enabling/checking hosted email auth settings in the dashboard

## Local dev with Supabase CLI

1. Install dependencies:

```bash
npm install
```

2. Make sure you have:
- Docker running
- Supabase CLI installed, or let `npx` fetch it on demand

3. Start the local Supabase stack:

```bash
npm run supabase:local:start
```

4. Check local Supabase status and copy the printed values into `.env.local`:

```bash
npm run supabase:local:status
```

Create `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=imports`
- `ADMIN_EMAILS=you@example.com`

5. Validate your env file:

```bash
npm run env:validate
```

6. Reset the local database so migrations, default data, and seed SQL are applied reproducibly:

```bash
npm run supabase:db:reset
```

7. Generate a demo workbook:

```bash
npm run demo:workbook
```

8. Start the app:

```bash
npm run dev
```

9. Open the local app at [http://localhost:3000](http://localhost:3000)

Local auth notes:
- `supabase/config.toml` already configures `http://localhost:3000` and `http://localhost:3000/auth/callback`
- local Supabase includes Inbucket for email testing, typically at `http://127.0.0.1:54324`

## Hosted Supabase project with CLI

1. Create a Supabase project in the dashboard.
2. Install dependencies:

```bash
npm install
```

3. Link the repo to your Supabase project:

```bash
npm run supabase:link
```

4. Apply migrations to the linked project:

```bash
npm run supabase:db:push
```

This applies:
- schema
- indexes and constraints
- default admin settings
- default categories
- the `imports` storage bucket row

5. Copy [`.env.example`](/Users/goran/Library/CloudStorage/Dropbox/My%20Codex%20Apps/Art%20Niche%20Expo%20Voting/.env.example) to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=imports`
- `ADMIN_EMAILS=you@example.com`

6. Validate env:

```bash
npm run env:validate
```

7. In the Supabase dashboard, verify hosted Auth settings:
- Email provider enabled
- Site URL set to `http://localhost:3000` for local testing
- Redirect URL `http://localhost:3000/auth/callback` added

8. Generate a demo workbook if needed:

```bash
npm run demo:workbook
```

9. Start the app:

```bash
npm run dev
```

## MVP admin workflow

1. Go to `/admin/login` and sign in with an allowed admin email.
2. Upload the organizer workbook in `/admin/imports`.
3. Click `Sync latest uploaded file`.
4. Review import warnings.
5. Optionally review imported brand metadata in `/admin/brands`.
6. Set the voting end time in `/admin/settings`.
7. Publish results intentionally in `/admin/results` after voting closes.
8. Export consented newsletter emails from `/admin/results` when needed.
9. Share one QR code pointing to `/`.

## Demo seed instructions

- Run `npm run demo:workbook` if you need a test workbook quickly.
- Set `voting_start_at` to a past time and `voting_end_at` to a future time.
- Upload a real organizer workbook and sync it.
- Make sure the workbook includes `RO Brand` and `Launched at Expo 2026` metadata if you want categories 1 and 2 to populate automatically.
- After voting ends, use the explicit publish action before viewing public results.

## Notes

- Votes are not stored in Excel.
- Import warnings do not stop sync; they surface issues for admin review.
- `CALAJ` and `Maison Evandie` are globally excluded from award nominees in derived category membership.
- The repo now includes Supabase CLI config in [supabase/config.toml](/Users/goran/Library/CloudStorage/Dropbox/My%20Codex%20Apps/Art%20Niche%20Expo%20Voting/supabase/config.toml).
- Default app data is now applied through migrations, not only through manual SQL steps.
