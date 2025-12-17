import { NextResponse } from 'next/server';
import { startGame, getRoom } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { roomId } = await request.json();

  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  const before = await getRoom(roomId);
  await startGame(roomId);
  const after = await getRoom(roomId);
  console.log('[room-start]', { action: 'start', roomId, version: after?.version ?? before?.version ?? null, phase: after?.phase ?? before?.phase ?? null, vercelRequestId: request.headers.get('x-vercel-id') });
  return NextResponse.json({ success: true });
}
