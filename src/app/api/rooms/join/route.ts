import { NextResponse } from 'next/server';
import { getRoom, joinRoom } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { roomId, nickname } = await request.json();

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
}
