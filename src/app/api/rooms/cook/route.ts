import { NextResponse } from 'next/server';
import { getRoom, setCookingPhase, setResult } from '@/lib/store';
import { generateDish, generateImage } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { roomId, isDev } = await request.json();

  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room) {
    console.log('[room-cook]', { action: 'cook-missing', roomId, version: null, phase: null, vercelRequestId: request.headers.get('x-vercel-id') });
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // 即座にCOOKINGフェーズへ移行
  await setCookingPhase(roomId);
  console.log('[room-cook]', { action: 'cook-begin', roomId, version: room.version + 1, phase: 'COOKING', vercelRequestId: request.headers.get('x-vercel-id') });

  // AI生成を非同期で実行（レスポンスを待たない）
  // 実際のサーバーレス環境ではプロセスがキルされる可能性があるが、MVP/Docker環境では問題ない
  (async () => {
    try {
      if (isDev) {
        // Devモード: 固定レスポンス
        await setResult(roomId, {
          dishName: 'DEV MODE カレー',
          description: 'これは開発モード用の固定レスポンスです。APIは使用されていません。',
          imageUrl: 'https://placehold.co/600x400?text=DEV+MODE',
        });
        console.log('[room-cook]', { action: 'cook-dev', roomId, version: (room.version ?? 0) + 2, phase: 'RESULT', vercelRequestId: request.headers.get('x-vercel-id') });
        return;
      }

      const ingredients = room.ingredients.map(i => i.text);
      
      let dishName, description, imageUrl;

      if (ingredients.length === 0) {
        dishName = 'おいしい空気';
        description = '素材の味を極限まで活かしました。カロリーゼロでヘルシーです。';
        imageUrl = await generateImage(
          'Delicious Air',
          'Empty plate on a table, minimal, artistic, white background',
          []
        );
      } else {
        const dish = await generateDish(ingredients);
        dishName = dish.name;
        description = dish.description;
        imageUrl = await generateImage(dish.name, dish.description, ingredients);
      }

      await setResult(roomId, {
        dishName,
        description,
        imageUrl,
      });
      console.log('[room-cook]', { action: 'cook-result', roomId, version: (room.version ?? 0) + 2, phase: 'RESULT', vercelRequestId: request.headers.get('x-vercel-id') });
    } catch (error) {
      console.error('Cooking failed:', error);
      // エラー状態またはフォールバック結果を設定
      await setResult(roomId, {
        dishName: '失敗した料理',
        description: '調理中に爆発しました。',
        imageUrl: 'https://placehold.co/600x400?text=Cooking+Failed',
      });
      console.log('[room-cook]', { action: 'cook-error', roomId, version: (room.version ?? 0) + 2, phase: 'RESULT', vercelRequestId: request.headers.get('x-vercel-id') });
    }
  })();

  return NextResponse.json({ success: true });
}
