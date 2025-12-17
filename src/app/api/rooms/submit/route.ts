import { NextResponse } from 'next/server';
import { addIngredient, getRoom } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { roomId, playerId, text } = await request.json();

  if (!roomId || !playerId || !text) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const roomBefore = await getRoom(roomId);
  const success = await addIngredient(roomId, playerId, text);
  const roomAfter = success ? await getRoom(roomId) : roomBefore;
  if (!success) {
    console.log('[room-submit]', { action: 'submit-deny', roomId, version: roomBefore?.version ?? null, phase: roomBefore?.phase ?? null, vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json({ error: 'Failed to add ingredient (invalid phase or limit reached)' }, { status: 400 });
  }

  console.log('[room-submit]', { action: 'submit-ok', roomId, version: roomAfter?.version ?? null, phase: roomAfter?.phase ?? null, vercelRequestId: request.headers.get('x-vercel-id') });
  return NextResponse.json({ success: true });
}
