import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  const { roomId, playerId, text } = await request.json();

  if (!roomId || !playerId || !text) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const success = store.addIngredient(roomId, playerId, text);
  if (!success) {
    return NextResponse.json({ error: 'Failed to add ingredient (invalid phase or limit reached)' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
