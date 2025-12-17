import { NextResponse } from 'next/server';
import { createRoom } from '@/lib/store';

export async function POST() {
  const roomId = await createRoom();
  return NextResponse.json({ roomId });
}
