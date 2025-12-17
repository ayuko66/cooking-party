
import { NextResponse } from 'next/server';
import { generateDish, generateImage } from '@/lib/ai';
import { CookingResult, KvUnavailableError, getRoom, setCookingPhase, setResult, getStoreMode, getStoreDebug } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fallbackResult: CookingResult = {
  dishName: 'AIシェフの謎鍋',
  description: '材料をこぼしてしまいましたが、とりあえず食べられそうな鍋ができました。',
  imageUrl: 'https://placehold.co/600x400?text=Cooking+Party',
};

export async function POST(request: Request) {
  let roomIdForLog: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    const { roomId, isDev } = body as { roomId?: string; isDev?: boolean };
    const normalizedRoomId = String(roomId ?? '').trim().toUpperCase();
    roomIdForLog = normalizedRoomId || null;

    if (!normalizedRoomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const room = await getRoom(normalizedRoomId);
    if (!room) {
      console.log('[room-cook]', { action: 'missing', roomId: normalizedRoomId, version: null, phase: null, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'Room not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    if (room.phase !== 'COUNTDOWN') {
      console.log('[room-cook]', { action: 'noop', roomId: normalizedRoomId, version: room.version ?? null, phase: room.phase, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ success: true });
    }

    await setCookingPhase(normalizedRoomId);

    const cookingRoom = await getRoom(normalizedRoomId);
    if (!cookingRoom) {
      console.warn('[room-cook]', { action: 'missing-after-cook', roomId: normalizedRoomId, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ success: true });
    }

    const ingredientTexts = cookingRoom.ingredients.map((ing) => ing.text);

    let result: CookingResult = fallbackResult;

    try {
      if (isDev) {
        result = {
          dishName: 'デバッグカレーDX',
          description: 'devモード用の固定レスポンスです。AIを呼ばずに完了しました。',
          imageUrl: 'https://placehold.co/600x400?text=DEV+COOK',
        };
      } else {
        const dish = await generateDish(ingredientTexts);
        const imageUrl = await generateImage(dish.name, dish.description, ingredientTexts);
        result = { dishName: dish.name, description: dish.description, imageUrl };
      }
    } catch (error) {
      console.error('[room-cook] generation failed', { roomId, error });
      result = fallbackResult;
    }

    const latestRoom = await getRoom(normalizedRoomId);
    if (!latestRoom) {
      console.warn('[room-cook]', { action: 'missing-before-save', roomId: normalizedRoomId, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ success: true });
    }

    await setResult(normalizedRoomId, result);
    const after = await getRoom(normalizedRoomId);
    console.log('[room-cook]', { action: 'cook', roomId: normalizedRoomId, version: after?.version ?? latestRoom.version ?? null, phase: after?.phase ?? latestRoom.phase ?? null, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    if (error instanceof KvUnavailableError) {
      console.error('[room-cook]', { status: 'kv_unavailable', roomId: roomIdForLog, ...getStoreDebug(), vercelRequestId: request.headers.get('x-vercel-id') });
      return NextResponse.json({ error: 'KV unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
