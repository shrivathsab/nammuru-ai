import { NextResponse, type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const VALID_CHANNELS = [
  'email',
  'whatsapp_bbmp',
  'whatsapp_rwa',
  'whatsapp_pothole_bot',
  'whatsapp_garbage',
  'tweet',
  'copy_link',
  'print',
] as const;

type ValidChannel = (typeof VALID_CHANNELS)[number];

interface ForwardRequest {
  channel: ValidChannel | string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ report_id: string }> },
) {
  try {
    const { report_id: reportIdHuman } = await params;
    const body = (await req.json()) as ForwardRequest;
    const { channel } = body;

    if (!reportIdHuman || !/^NMR-\d{8}-[A-F0-9]{4}$/i.test(reportIdHuman)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report ID format' },
        { status: 400 },
      );
    }

    if (!channel || typeof channel !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Channel is required' },
        { status: 400 },
      );
    }

    const supabase = getServerClient();

    const { data, error: fetchError } = await supabase
      .from('reports')
      .select('id, forwarded_channels')
      .eq('report_id_human', reportIdHuman)
      .single();

    if (fetchError || !data) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 },
      );
    }

    const report = data as unknown as {
      id: string;
      forwarded_channels: Array<{ channel: string; at: string }> | null;
    };

    const existing = report.forwarded_channels ?? [];
    const updated = [...existing, { channel, at: new Date().toISOString() }];
    const trimmed = updated.slice(-50);

    const { error: updateError } = await supabase
      .from('reports')
      .update({ forwarded_channels: trimmed } as never)
      .eq('id', report.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to record forward' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      channel,
      total_forwards: trimmed.length,
    });
  } catch (err) {
    console.error('[forward] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
