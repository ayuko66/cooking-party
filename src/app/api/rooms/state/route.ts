import { NextResponse } from 'next/server';
import { KvUnavailableError, getRoomWithVersion } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const sinceVersionParam = searchParams.get('sinceVersion');
  const sinceVersion = sinceVersionParam ? parseInt(sinceVersionParam, 10) : undefined;

  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  try {
    const result = await getRoomWithVersion(roomId, sinceVersion);

    if (result.status === 'missing') {
      console.log('[room-state]', { action: 'state', roomId, version: null, phase: null, vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'Room not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    if (result.status === 'unchanged') {
      console.log('[room-state]', { action: 'state', roomId, version: sinceVersion, phase: null, vercelRequestId: request.headers.get('x-vercel-id') });
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    console.log('[room-state]', { action: 'state', roomId, version: result.room.version, phase: result.room.phase, vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json(result.room, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof KvUnavailableError) {
      console.error('[room-state]', { status: 'kv_unavailable', roomId, vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'KV unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
