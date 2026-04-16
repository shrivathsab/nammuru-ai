import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    return NextResponse.json({ 
      error: 'Missing env vars',
      url_exists: !!url,
      key_exists: !!key
    })
  }

  const supabase = createClient(url, key)
  const { data, error, count } = await supabase
    .from('reports')
    .select('*', { count: 'exact' })
    .limit(5)

  return NextResponse.json({ 
    data, 
    error, 
    count,
    url_prefix: url.substring(0, 30)
  })
}
