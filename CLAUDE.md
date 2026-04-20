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
