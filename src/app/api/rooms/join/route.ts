import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  const { roomId, nickname } = await request.json();

  if (!roomId || !nickname) {
    return NextResponse.json({ error: 'Missing roomId or nickname' }, { status: 400 });
  }

  const room = store.getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: '部屋が見つかりません' }, { status: 404 });
  }

  const player = store.joinRoom(roomId, nickname);
  if (!player) {
    return NextResponse.json({ error: '次のゲームまで待っててね' }, { status: 400 });
  }

  return NextResponse.json({ player });
}
