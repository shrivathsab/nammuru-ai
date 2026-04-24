// TEMPORARY DEBUG ROUTE — DELETE AFTER DIAGNOSIS
// Place at: app/api/debug-report/route.ts
// Access at: http://localhost:3000/api/debug-report?id=NMR-20260423-5484

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Test 1: env vars present?
  const envCheck = {
    url_present: !!url,
    url_value: url?.slice(0, 30) + '...',
    anon_key_present: !!anonKey,
    service_key_present: !!serviceKey,
  };

  // Test 2: anon client query
  const anonClient = createClient(url!, anonKey!);
  const { data: anonData, error: anonError } = await anonClient
    .from('reports')
    .select('id, report_id_human, report_hash, created_at, issue_type, status')
    .eq('report_id_human', id)
    .maybeSingle();

  // Test 3: service role client query (if key exists)
  let serviceData = null;
  let serviceError = null;
  if (serviceKey) {
    const serviceClient = createClient(url!, serviceKey);
    const result = await serviceClient
      .from('reports')
      .select('id, report_id_human, report_hash, created_at, issue_type, status')
      .eq('report_id_human', id)
      .maybeSingle();
    serviceData = result.data;
    serviceError = result.error;
  }

  // Test 4: list all report_id_human values in DB (last 10)
  const listClient = createClient(url!, serviceKey ?? anonKey!);
  const { data: allReports, error: listError } = await listClient
    .from('reports')
    .select('id, report_id_human, report_hash, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  // Test 5: check RLS policies
  const { data: policies, error: policiesError } = await listClient
    .rpc('get_policies')
    .limit(10)
    .maybeSingle()
    .then(() => ({ data: 'rpc not available', error: null }))
    .catch(() => ({ data: 'rpc not available', error: null }));

  return NextResponse.json({
    querying_for: id,
    env_check: envCheck,
    anon_client: {
      data: anonData,
      error: anonError,
    },
    service_role_client: {
      available: !!serviceKey,
      data: serviceData,
      error: serviceError,
    },
    all_reports_in_db: {
      count: allReports?.length ?? 0,
      rows: allReports?.map(r => ({
        id: r.id,
        report_id_human: r.report_id_human,
        report_hash: r.report_hash?.slice(0, 8),
        created_at: r.created_at,
      })),
      error: listError,
    },
  }, {
    headers: { 'Content-Type': 'application/json' },
  });
}
