# NCC Recruitment Portal

A NITER Computer Club recruitment application built with React, Vite, TypeScript, and Supabase. Applications are publicly insertable, but student records are not publicly readable. Applicant photos are stored in a private Supabase Storage bucket.

## Run locally

1. Install Node.js 18 or newer and run `npm install`.
2. Copy `.env.example` to `.env` if needed. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the application. Do not expose server-only credentials with a `VITE_` prefix.
3. Apply the migrations in order in the Supabase SQL Editor:
   - [`supabase/migrations/20261003230000_create_recruitment_submissions.sql`](./supabase/migrations/20261003230000_create_recruitment_submissions.sql)
   - [`supabase/migrations/20261004001200_add_other_interest_and_student_id_format.sql`](./supabase/migrations/20261004001200_add_other_interest_and_student_id_format.sql)
   - [`supabase/migrations/20261004004000_private_photos_admin_csv.sql`](./supabase/migrations/20261004004000_private_photos_admin_csv.sql)
   - [`supabase/migrations/20261004130000_align_photo_bucket_and_student_ids.sql`](./supabase/migrations/20261004130000_align_photo_bucket_and_student_ids.sql)
4. Run `npm run dev` and open the local URL printed by Vite. Vite's development server does not run the Vercel `/api/admin/export` function, so admin CSV export is available on the deployed Vercel site.

The migrations create the `recruitment_submissions` table with anonymous insert-only access and a private `recruitment-photos` bucket (JPEG/PNG, maximum 5 MB). Student IDs use the matching department prefix—CSE `CS`, EEE `EE`, Textile `TE`, IPE `IP`, or FDAE `FD`—followed by `-26` and five more digits (for example, `TE-2607001`). Applicants may choose listed segments or enter a custom interest. Student details have no public read policy; photos are stored as private object paths, not public URLs. Anonymous submissions still need appropriate Supabase rate limits, monitoring, a retention policy, and a privacy notice.

If the earlier migrations were already applied to an existing project, apply the latest alignment migration. It ensures the `recruitment-photos` bucket is private and permits anonymous uploads to that bucket, then enforces the department-specific ID formats for new submissions. Existing photo objects in the older `student-photos` bucket are left there and remain private; new uploads use `recruitment-photos`.

## Deploy to Vercel

1. Import the repository root in Vercel. It reads [`vercel.json`](./vercel.json) for the Vite build, `dist` output, SPA fallback, and baseline security headers.
2. In **Project Settings → Environment Variables**, add the following for the environments you use:
   - `VITE_SUPABASE_URL` — Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key.
   - `SUPABASE_URL` — the same Supabase project URL, server-side.
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key; server-side only.
   - `ADMIN_EMAILS` — comma-separated email addresses allowed to export, for example `you@example.com`.
3. In Supabase **Authentication → Users**, create or invite the admin account using an email listed in `ADMIN_EMAILS`. Keep public sign-up disabled unless you separately need it; the allowlist is still enforced by the server endpoint.
4. Redeploy Vercel after setting the environment variables and applying the migrations. Open the site footer's **Admin CSV** control, sign in with the authorized Supabase account, then choose **Download all applicant data**.

The CSV endpoint validates the Supabase access token, checks the normalized email against the server-side allowlist, and uses the service-role key only on the server. It paginates through all records and includes the private photo object path (not a publicly retrievable photo URL). The CSV contains sensitive personal data, so store and share it securely. Never add the service-role key or `ADMIN_EMAILS` to a `VITE_` variable, commit them, or put them in browser code.

## External data sync

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NCC_EXTERNAL_SYNC_URL`, and `NCC_EXTERNAL_SYNC_TOKEN` in a trusted local/server environment, then run `npm run sync:external`. The script sends applicant data, including private photo object paths, to the explicitly configured endpoint. Only use a destination you control and have secured. Never expose these server-only credentials to browser code or commit them.
