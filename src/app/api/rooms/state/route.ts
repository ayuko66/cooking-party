import { NextResponse } from 'next/server';
import { StoreUnavailableError, getRoomWithVersion, getStoreDebug, normalizeRoomId } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomIdParam = searchParams.get('roomId');
  const sinceVersionParam = searchParams.get('sinceVersion');
  const sinceVersion = sinceVersionParam ? parseInt(sinceVersionParam, 10) : undefined;
  const roomId = normalizeRoomId(roomIdParam ?? '');
  const debug = getStoreDebug();

  if (!roomId) {
    return NextResponse.json(
      { error: 'Missing roomId' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const result = await getRoomWithVersion(roomId, sinceVersion);

    if (result.status === 'missing') {
      console.log('[room-state]', {
        action: 'state-missing',
        roomId,
        version: null,
        phase: null,
        ...debug,
        vercelRequestId: request.headers.get('x-vercel-id'),
      });

      if (debug.activeStore === 'none') {
        return NextResponse.json(
          { error: 'Storage not configured' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (result.status === 'unchanged') {
      console.log('[room-state]', {
        action: 'state-unchanged',
        roomId,
        version: sinceVersion,
        phase: null,
        ...debug,
        vercelRequestId: request.headers.get('x-vercel-id'),
      });

      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    console.log('[room-state]', {
      action: 'state-full',
      roomId,
      version: result.room.version,
      phase: result.room.phase,
      ...debug,
      vercelRequestId: request.headers.get('x-vercel-id'),
    });

    return NextResponse.json(result.room, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof StoreUnavailableError) {
      console.error('[room-state]', {
        status: 'store_unavailable',
        roomId,
        ...debug,
        vercelRequestId: request.headers.get('x-vercel-id'),
      });

      return NextResponse.json(
        { error: 'Store unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    throw error;
  }
}