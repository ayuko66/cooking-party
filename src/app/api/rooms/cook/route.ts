import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { generateDish, generateImage } from '@/lib/ai';

export async function POST(request: Request) {
  const { roomId, isDev } = await request.json();

  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  const room = store.getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // 即座にCOOKINGフェーズへ移行
  store.setCookingPhase(roomId);

  // AI生成を非同期で実行（レスポンスを待たない）
  // 実際のサーバーレス環境ではプロセスがキルされる可能性があるが、MVP/Docker環境では問題ない
  (async () => {
    try {
      if (isDev) {
        // Devモード: 固定レスポンス
        store.setResult(roomId, {
          dishName: 'DEV MODE カレー',
          description: 'これは開発モード用の固定レスポンスです。APIは使用されていません。',
          imageUrl: 'https://placehold.co/600x400?text=DEV+MODE',
        });
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

      store.setResult(roomId, {
        dishName,
        description,
        imageUrl,
      });
    } catch (error) {
      console.error('Cooking failed:', error);
      // エラー状態またはフォールバック結果を設定
      store.setResult(roomId, {
        dishName: '失敗した料理',
        description: '調理中に爆発しました。',
        imageUrl: 'https://placehold.co/600x400?text=Cooking+Failed',
      });
    }
  })();

  return NextResponse.json({ success: true });
}
