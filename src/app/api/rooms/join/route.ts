import { NextResponse } from 'next/server';
import { StoreUnavailableError, getRoom, joinRoom, getStoreDebug, normalizeRoomId } from '@/lib/store';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRoomRetry = async (roomId: string) => {
  const delays = [0, 80, 200];
  for (let i = 0; i < delays.length; i += 1) {
    if (delays[i] > 0) await wait(delays[i]);
    const room = await getRoom(roomId);
    if (room) return room;
  }
  return null;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let roomIdForLog: string | null = null;

  try {
    const { roomId, nickname } = await request.json();
    const normalizedRoomId = normalizeRoomId(roomId ?? '');
    const debug = getStoreDebug();
    roomIdForLog = normalizedRoomId || null;

    if (!normalizedRoomId || !nickname) {
      return NextResponse.json(
        { error: 'Missing roomId or nickname' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const room = await getRoomRetry(normalizedRoomId);

    if (!room) {
      // ストア未設定/接続不可 なら 503（= missing room と区別）
      if (debug.activeStore === 'none') {
        console.log('[room-join]', {
          action: 'join',
          roomId: normalizedRoomId,
          version: null,
          phase: null,
          ...debug,
          vercelRequestId: request.headers.get('x-vercel-id'),
        });
        return NextResponse.json(
          { error: 'Storage not configured' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      console.log('[room-join]', {
        action: 'join',
        roomId: normalizedRoomId,
        version: null,
        phase: null,
        ...debug,
        vercelRequestId: request.headers.get('x-vercel-id'),
      });
      return NextResponse.json(
        { error: '部屋が見つかりません' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const player = await joinRoom(normalizedRoomId, nickname);
    if (!player) {
      const latest = await getRoomRetry(normalizedRoomId);

      console.log('[room-join]', {
        action: 'join-deny',
        roomId: normalizedRoomId,
        version: latest?.version ?? room.version,
        phase: latest?.phase ?? room.phase,
        ...debug,
        vercelRequestId: request.headers.get('x-vercel-id'),
      });

      return NextResponse.json(
        { error: '次のゲームまで待っててね' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.log('[room-join]', {
      action: 'join-ok',
      roomId: normalizedRoomId,
      version: room.version,
      phase: room.phase,
      ...debug,
      vercelRequestId: request.headers.get('x-vercel-id'),
    });

    return NextResponse.json(
      { player },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof StoreUnavailableError) {
      console.error('[room-join]', {
        status: 'store_unavailable',
        roomId: roomIdForLog,
        ...getStoreDebug(),
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