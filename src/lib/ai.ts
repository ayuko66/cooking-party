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
  const ingredientText =
    ingredients.length > 0 ? ingredients.join(', ') : 'no specific ingredients';

  const prompt = `
An illustration of a single Japanese home-style fantasy dish called "${dishName}".
Main ingredients: ${ingredientText}.
Top-down view, one round plate in the center, only this dish on the table.
Cute, pop illustration style, not realistic, soft colors, simple background, white or light wood table.
`.trim();

const negativePrompt = `
sushi, sashimi, nigiri, maki roll, multiple plates, many side dishes,
human, hands, text, logo, watermark, photorealistic photo, 3d render
`.trim();

  try {
    console.log('[Stability AI] Request prompt:', prompt);
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('negative_prompt', negativePrompt);
    formData.append('output_format', 'png');
    formData.append('aspect_ratio', '1:1'); // 比率
    const result = await fetch(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: 'application/json', // base64 JSON
        },
        body: formData,
      }
    );

    if (!result.ok) {
      const text = await result.text();
      throw new Error(`Stability AI error: ${result.status} ${text}`);
    }

    const data = await result.json() as { image: string };
    return `data:image/png;base64,${data.image}`;
  } catch (error) {
    console.error('Stability AI generation error:', error);
    return 'https://placehold.co/600x400?text=Image+Generation+Failed';
  }
}
