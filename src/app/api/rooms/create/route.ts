import { NextResponse } from 'next/server';
import { KvUnavailableError, createRoom } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const roomId = await createRoom();
    console.log('[room-create]', { action: 'create', roomId, vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json({ roomId });
  } catch (error) {
    if (error instanceof KvUnavailableError) {
      console.error('[room-create]', { status: 'kv_unavailable', roomId: null, vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'KV unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
