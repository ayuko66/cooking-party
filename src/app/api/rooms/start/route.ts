import { NextResponse } from 'next/server';
import { KvUnavailableError, startGame, getRoom } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let roomIdForLog: string | null = null;
  try {
    const { roomId } = await request.json();
    roomIdForLog = roomId ?? null;

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const before = await getRoom(roomId);
    await startGame(roomId);
    const after = await getRoom(roomId);
    console.log('[room-start]', { action: 'start', roomId, version: after?.version ?? before?.version ?? null, phase: after?.phase ?? before?.phase ?? null, vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof KvUnavailableError) {
      console.error('[room-start]', { status: 'kv_unavailable', roomId: roomIdForLog, vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'KV unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
