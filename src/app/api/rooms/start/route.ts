import { NextResponse } from 'next/server';
import { startGame } from '@/lib/store';

export async function POST(request: Request) {
  const { roomId } = await request.json();

  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  await startGame(roomId);
  return NextResponse.json({ success: true });
}
