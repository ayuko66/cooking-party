import { NextResponse } from 'next/server';
import { KvUnavailableError, getRoom, joinRoom } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let roomIdForLog: string | null = null;
  try {
    const { roomId, nickname } = await request.json();
    roomIdForLog = roomId ?? null;

    if (!roomId || !nickname) {
      return NextResponse.json({ error: 'Missing roomId or nickname' }, { status: 400 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      console.log('[room-join]', { action: 'join', roomId, version: null, phase: null, vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: '部屋が見つかりません' }, { status: 404 });
    }

    const player = await joinRoom(roomId, nickname);
    if (!player) {
      console.log('[room-join]', { action: 'join-deny', roomId, version: room.version, phase: room.phase, vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: '次のゲームまで待っててね' }, { status: 400 });
    }

    console.log('[room-join]', { action: 'join-ok', roomId, version: room.version, phase: room.phase, vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json({ player });
  } catch (error) {
    if (error instanceof KvUnavailableError) {
      console.error('[room-join]', { status: 'kv_unavailable', roomId: roomIdForLog, vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'KV unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
