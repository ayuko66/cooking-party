import { NextResponse } from 'next/server';
import { createRoom } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const roomId = await createRoom();
  console.log('[room-create]', { action: 'create', roomId, vercelRequestId: request.headers.get('x-vercel-id') });
  return NextResponse.json({ roomId });
}
