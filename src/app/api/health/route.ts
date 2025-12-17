import { NextResponse } from 'next/server';
import { getStoreDebug } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const dbg = getStoreDebug();

  if (dbg.activeStore === 'none') {
    return NextResponse.json(
      { status: 'error', error: 'KV env not configured', store: dbg },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { status: 'ok', store: dbg },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}