import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  const { roomId, nickname } = await request.json();

  if (!roomId || !nickname) {
    return NextResponse.json({ error: 'Missing roomId or nickname' }, { status: 400 });
  }

  const player = store.joinRoom(roomId, nickname);
  if (!player) {
    return NextResponse.json({ error: 'Failed to join room (full or started)' }, { status: 400 });
  }

  return NextResponse.json({ player });
}
