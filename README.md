# NCC Recruitment Portal

A zero-login recruitment application for NITER Computer Club, built with React, Vite, TypeScript, Three.js, and Supabase.

## Run locally

1. Install Node.js 18 or newer.
2. Install dependencies with `npm install`.
3. If `.env` does not already exist, copy `.env.example` to `.env`. Otherwise keep your existing `.env` and confirm that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set. Keep all service-role and external-sync credentials server-side; never use a `VITE_` prefix for them.
4. In the Supabase SQL editor, run [`supabase/migrations/20261003230000_create_recruitment_submissions.sql`](./supabase/migrations/20261003230000_create_recruitment_submissions.sql).
5. Run `npm run dev` and open the local URL printed by Vite.

The migration creates the `recruitment_submissions` table, public insert-only RLS policy, and public `student-photos` bucket (JPEG/PNG, maximum 5 MB). Public bucket photos are retrievable by URL, so tell applicants before upload and use only an image they are comfortable sharing with the recruitment team. Public applications intentionally have no read, update, or delete access. Because submissions are public, configure Supabase rate limits and monitoring before a production launch.

## Deploy to Vercel

1. Push this project to GitHub and import `kn8trix/NCC-recruitment` in Vercel. Use the repository root as the project root; Vercel reads [`vercel.json`](./vercel.json) for the Vite build, `dist` output, SPA route fallback, and baseline security headers.
2. In **Project Settings → Environment Variables**, add these for **Production**, **Preview**, and **Development**:
   - `VITE_SUPABASE_URL` — the Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY` — the Supabase publishable/anon key.
3. Deploy, then test the deployed form with a new test student ID, photo upload, successful insert, pass, and PDF download.

Only the Supabase publishable/anon key belongs in a `VITE_` variable. Do not add `SUPABASE_SERVICE_ROLE_KEY` or external-sync credentials to Vercel's client-exposed variables; the external sync script runs in a trusted server/local environment and is not a deployed API route. Apply the SQL migration to the Supabase project before testing submissions. If restricting Supabase origins, allow the production domain and the Vercel preview domains used for testing.

Before public launch, configure anti-abuse/rate limits and monitoring for anonymous submissions, decide how long applicant data and uploaded photos will be retained, and publish a privacy notice. The current photo bucket is public by design, so uploaded image URLs can be viewed by anyone who obtains them.

## External data sync

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NCC_EXTERNAL_SYNC_URL`, and `NCC_EXTERNAL_SYNC_TOKEN` in a trusted local/server environment, then run `npm run sync:external`. The script fetches records with the service-role key and POSTs the documented export shape to the configured endpoint. Never expose these server-only secrets to browser code or commit them.
