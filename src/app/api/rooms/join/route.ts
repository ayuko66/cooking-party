import { NextResponse } from 'next/server';
import { KvUnavailableError, getRoom, joinRoom, getStoreMode, getStoreDebug } from '@/lib/store';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRoomRetry = async (roomId: string) => {
  const delays = [0, 80, 200];
  for (let i = 0; i < delays.length; i += 1) {
    if (delays[i] > 0) await wait(delays[i]);
    const room = await getRoom(roomId);
    if (room) return room;
  }
  return null;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let roomIdForLog: string | null = null;
  try {
    const { roomId, nickname } = await request.json();
    const normalizedRoomId = String(roomId ?? '').trim().toUpperCase();
    roomIdForLog = normalizedRoomId || null;

    if (!normalizedRoomId || !nickname) {
      return NextResponse.json({ error: 'Missing roomId or nickname' }, { status: 400 });
    }

    const room = await getRoomRetry(normalizedRoomId);
    if (!room) {
      console.log('[room-join]', { action: 'join', roomId: normalizedRoomId, version: null, phase: null, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: '部屋が見つかりません' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    const player = await joinRoom(normalizedRoomId, nickname);

    if (!player) {
      const latest = await getRoomRetry(normalizedRoomId);

      if (!latest) {
        console.warn('[room-join]', {
          action: 'join-missing-during-update',
          roomId: normalizedRoomId,
          version: room.version,
          phase: room.phase,
          ...getStoreDebug(),
          vercelRequestId: request.headers.get('x-vercel-id'),
        });
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      }

      console.log('[room-join]', {
        action: 'join-deny',
        roomId: normalizedRoomId,
        version: latest.version,
        phase: latest.phase,
        ...getStoreDebug(),
        vercelRequestId: request.headers.get('x-vercel-id'),
      });
      return NextResponse.json({ error: '次のゲームまで待っててね' }, { status: 400 });
    }
    console.log('[room-join]', { action: 'join-ok', roomId: normalizedRoomId, version: room.version, phase: room.phase, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json({ player });
  } catch (error) {
    if (error instanceof KvUnavailableError) {
      console.error('[room-join]', { status: 'kv_unavailable', roomId: roomIdForLog, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'KV unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
