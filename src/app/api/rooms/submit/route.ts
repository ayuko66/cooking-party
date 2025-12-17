import { NextResponse } from 'next/server';
import { KvUnavailableError, addIngredient, getRoom, getStoreDebug, normalizeRoomId } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let roomIdForLog: string | null = null;
  try {
    const { roomId, playerId, text } = await request.json();
    const normalizedRoomId = normalizeRoomId(roomId ?? '');
    roomIdForLog = normalizedRoomId || null;

    if (!normalizedRoomId || !playerId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const roomBefore = await getRoom(normalizedRoomId);
    if (!roomBefore) {
      console.log('[room-submit]', { action: 'submit-missing', roomId: normalizedRoomId, version: null, phase: null, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'Room not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    const success = await addIngredient(normalizedRoomId, playerId, text);
    const roomAfter = success ? await getRoom(normalizedRoomId) : roomBefore;
    if (!success) {
      console.log('[room-submit]', { action: 'submit-deny', roomId: normalizedRoomId, version: roomBefore?.version ?? null, phase: roomBefore?.phase ?? null, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'Failed to add ingredient (invalid phase or limit reached)' }, { status: 400 });
    }

    console.log('[room-submit]', { action: 'submit-ok', roomId: normalizedRoomId, version: roomAfter?.version ?? null, phase: roomAfter?.phase ?? null, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof KvUnavailableError) {
      console.error('[room-submit]', { status: 'kv_unavailable', roomId: roomIdForLog, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'KV unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
