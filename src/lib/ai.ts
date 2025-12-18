import Groq from 'groq-sdk';


const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY is not set');
    return new Groq({ apiKey });
  }
  return new Groq({ apiKey });
};

export async function generateDish(
  ingredients: string[]
): Promise<{ name: string; description: string }> {
  if (!ingredients.length) {
    return {
      name: '材料ゼロ定食',
      description: '何も入っていないのに、なぜか満腹になる不思議な定食です。',
    };
  }

  const client = getGroqClient();

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
  {
    role: 'system',
    content: `
あなたはパーティーゲーム用のシェフAIです。
必ずユーザーが指定した材料を活かして料理名と説明を考えてください。
出力は必ずJSONのみ。余計な文字は入れないこと。`,
  },
  {
    role: 'user',
    content: `
以下の材料を使って、架空の料理を1つ考案してください。
材料: ${ingredients.join(', ')}

制約:
- 全ての材料を無視してはいけません
- 説明文の中に、材料名のうち少なくとも2個は「そのままの単語」として含めてください

出力フォーマット（JSON）:
{
  "name": "料理名（20文字以内、ユーモラスに）",
  "description": "料理の説明（50〜100文字程度、パーティーゲーム向けに楽しく）"
}
JSONのみを出力し、余計なテキストは含めないでください。
`,
  },
];

  try {
    console.log('[Groq] Request messages:', JSON.stringify(messages, null, 2));
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 256,
    });

    const content = completion.choices[0]?.message?.content;
    console.log('[Groq] Response content:', content);
    if (!content) throw new Error('No content from Groq');

    const parsed = JSON.parse(content);

    // 念のため材料を使ってるかざっくりチェック
    const used = ingredients.some((ing) =>
      String(parsed.description ?? '').includes(ing)
    );
    if (!used) {
      console.warn('Ingredients not used in description:', ingredients, parsed);
    }

    return parsed;
  } catch (error) {
    console.error('Groq generation error:', error);
    return {
      name: '謎の暗黒物質',
      description:
        'AIが混乱しているようです。材料がカオスすぎたのかもしれません。',
    };
  }
}

export async function generateImage(dishName: string, description: string, ingredients: string[] = []): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_API_KEY is not set');
    return 'https://placehold.co/600x400?text=API+Key+Missing';
  }

  const ingredientText =
    ingredients.length > 0 ? ingredients.join(', ') : 'no specific ingredients';

  const prompt = `
Create a cute, pop, whimsical illustration of a single Japanese home-style fantasy dish named "${dishName}".
Main ingredients: ${ingredientText}.
Description: ${description}.

Composition: top-down view, one round plate centered, only this dish on the table. Clean simple background.
Style: illustrated, non-photorealistic, soft yet vivid colors, playful and joyful palette, slightly surreal/fantasy feeling.
Table: white or very light wood.

STRICT NEGATIVES:
- Do NOT include any text, title, letters, numbers, logos, watermarks, labels, captions, signs, packaging, menus, or UI elements.
- Do NOT add extra dishes, utensils, hands, people, animals, or background objects.
- Avoid realism, avoid photo look, avoid heavy shading, avoid messy texture.
`.trim();

  try {
    console.log('[Gemini] Request prompt:', prompt);
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // レスポンスから画像を抽出する
    // 注: 画像生成レスポンスの構造は異なる場合があります。
    // 通常、一部のエンドポイントでは candidates[0].content.parts[0].inlineData などに含まれるか、URIが返されます。
    // 現時点では、標準的な処理を想定するか、出力を検査します。
    // ただし、このコンテキストでの画像モデルレスポンスの具体的な型定義がないため、
    // 利用可能な場合は標準的なbase64データを検索しようとします。
    
    // 注: 私の知識カットオフ時点では、"gemini-2.5-flash-image" は画像を提供する可能性があります。
    // テキストが返される場合は失敗となります。
    // フォールバックとログ出力を追加します。
    
    console.log('[Gemini] Response:', JSON.stringify(response, null, 2));
    
    // インラインデータを確認 (従来のGeminiビジョンの*入力*画像のアプローチだが、出力でもあり得る？)
    // または、特定のヘルパーを使用している場合は 'images' フィールドがあるか確認。
    // しかし、汎用的な `generateContent` を使用しているため、partsを確認します。
    
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No candidates returned');
    }
    
    const parts = candidates[0].content.parts;
    const imagePart = parts.find((p: any) => p.inlineData || p.fileData);
    
    if (imagePart && imagePart.inlineData) {
       return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    
    // フォールバック: テキスト内にURLが含まれている場合 (一部のモデルはこれを行う)
    const text = response.text();
    if (text.startsWith('http')) {
        return text;
    }

    throw new Error('No image data found in response');

  } catch (error) {
    console.error('Gemini generation error:', error);
    return 'https://placehold.co/600x400?text=Image+Generation+Failed';
  }
}
