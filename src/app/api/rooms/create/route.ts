import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST() {
  const roomId = store.createRoom();
  return NextResponse.json({ roomId });
}
