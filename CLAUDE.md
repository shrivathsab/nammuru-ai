@AGENTS.md
# NammuruAI — Claude Code context
## Project: AI civic accountability platform for Bengaluru
## Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase · Anthropic API
## Deployment: Vercel (auto-deploy on push to main branch)

## File structure conventions:
- API routes → app/api/[route]/route.ts
- Page components → app/[page]/page.tsx
- Shared components → components/
- Supabase client → lib/supabase.ts
- Ward data → lib/wards.ts (hardcoded JSON)
- Types → lib/types.ts

## Rules Claude Code must follow:
- Always use claude-haiku-4-5-20251001 for Anthropic API calls
- Never use server actions — API routes only
- Mobile-first Tailwind, no component libraries
- Accent colour: #0F6E56 (teal — namma ooru green)
- All Anthropic API calls go through app/api/ never client-side
- Rate limit all AI routes: 5 req/min per IP
- Never run `npx tsc --noEmit` automatically after file changes — it is too slow
- For type verification use `./node_modules/.bin/tsc --noEmit --skipLibCheck 2>&1 | head -20`
- Only run a full typecheck when the user explicitly says "run typecheck"
- Never run full project typechecks after every edit — reason about type correctness from context instead

## TypeScript Verification

NEVER run `npx tsc --noEmit` to verify type correctness.
It is too slow in this environment.

Instead, verify types by:
1. Reading the file and reasoning about type correctness directly
2. If a type check is truly needed, run:
   `./node_modules/.bin/tsc --noEmit --skipLibCheck 2>&1 | head -20`
3. For single file checks, reason about the types from context —
   do not run a full project typecheck after every change.

Only run a full typecheck when explicitly asked by the user with
the phrase "run typecheck".

## Supabase schema (reports table):
- id uuid PK, created_at timestamptz, lat float8, lng float8
- ward_name text, issue_type text, severity text
- description text, image_url text, report_hash text unique
- status text default 'open', email_draft text, tweet_thread jsonb
- location geography(Point,4326) — PostGIS

## 5 pilot wards (Bengaluru):
Whitefield, HSR Layout, Koramangala, Indiranagar, Jayanagar

## Visualizations planned:
- Leaflet heatmap (leaflet.heat) on homepage
- Ward leaderboard — Recharts horizontal bar
- Issue type donut — Recharts PieChart
- Severity timeline — Recharts LineChart
- Live activity feed — Supabase Realtime
- OG image per report — Next.js opengraph-image.tsx
## Supabase RLS note
## Always run these policies after creating any new table:
## CREATE POLICY allow_read ON [table] FOR SELECT TO anon USING (true);
## CREATE POLICY allow_insert ON [table] FOR INSERT TO anon WITH CHECK (true);

## Jurisdiction detection (added Day 3)
## Layer 1: lib/jurisdictionCheck.ts — known exclusion polygon check (sync)
## Layer 2: detectPrivateProperty() — Google Places API 30m radius check (async)
## Layer 3: Claude Vision detects private property signage in image
## Rule: NEVER block submission on jurisdiction uncertainty — flag and reroute only
## Fallback: if non-BBMP detected, route email to authority_email from jurisdictionResult
## If all checks uncertain: route to grievance@bbmp.gov.in with jurisdiction note in email
