import { NextResponse } from 'next/server';
import { getRoomWithVersion } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const sinceVersionParam = searchParams.get('sinceVersion');
  const sinceVersion = sinceVersionParam ? parseInt(sinceVersionParam, 10) : undefined;

  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  const result = await getRoomWithVersion(roomId, sinceVersion);

  if (result.status === 'missing') {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (result.status === 'unchanged') {
    return new Response(null, { status: 204 });
  }

  return NextResponse.json(result.room, { status: 200 });
}
