import { NextResponse } from 'next/server';
import { KvUnavailableError, startGame, getRoom, getStoreDebug, normalizeRoomId } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let roomIdForLog: string | null = null;
  try {
    const { roomId } = await request.json();
    const normalizedRoomId = normalizeRoomId(roomId ?? '');
    const debug = getStoreDebug();
    roomIdForLog = normalizedRoomId || null;

    if (!normalizedRoomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const before = await getRoom(normalizedRoomId);
    if (!before) {
      console.log('[room-start]', { action: 'start', roomId: normalizedRoomId, version: null, phase: null, ...debug, vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'Room not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    await startGame(normalizedRoomId);
    const after = await getRoom(normalizedRoomId);
    console.log('[room-start]', { action: 'start', roomId: normalizedRoomId, version: after?.version ?? before?.version ?? null, phase: after?.phase ?? before?.phase ?? null, ...debug, vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof KvUnavailableError) {
      console.error('[room-start]', { status: 'kv_unavailable', roomId: roomIdForLog, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'KV unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
