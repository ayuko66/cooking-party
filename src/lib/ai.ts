import Groq from 'groq-sdk';


const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY is not set');
    // ビルド時にモジュールレベルでのエラーを避けるため、ダミーを返すか、呼び出し時にエラーにする
    // ここでthrowすると関数呼び出し時にエラーになるが、それは問題ない
    // ビルドを安全に行うため、ダミーを返す
    return new Groq({ apiKey: 'dummy' }); 
  }
  return new Groq({ apiKey });
};


export async function generateDish(ingredients: string[]): Promise<{ name: string; description: string }> {
  const prompt = `
あなたはパーティーゲームの料理人です。以下の材料を使って、架空の料理を考案してください。
材料: ${ingredients.join(', ')}

以下のJSON形式で出力してください。
{
  "name": "料理名（20文字以内、ユーモラスに）",
  "description": "料理の説明（50〜100文字程度、パーティーゲーム向けに楽しく）"
}
JSONのみを出力し、余計なテキストは含めないでください。
`;

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192', // または mixtral-8x7b-32768, gemma-7b-it
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No content from Groq');

    return JSON.parse(content);
  } catch (error) {
    console.error('Groq generation error:', error);
    return {
      name: '謎の暗黒物質',
      description: 'AIが混乱しているようです。材料がカオスすぎたのかもしれません。',
    };
  }
}

export async function generateImage(dishName: string, description: string): Promise<string> {
  const prompt = `A delicious and humorous food illustration of "${dishName}". Description: ${description}. Style: Pop art, vibrant colors, white background, simple composition, high quality food illustration.`;

  try {
    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: 'image/*',
      },
      body: new FormData(), // フィールドを追加する必要がある
    });
    
    // Stability AI v2beta は multipart/form-data を期待する
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'png');

    const result = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: 'application/json', // base64を含むJSONを取得
      },
      body: formData,
    });

    if (!result.ok) {
        const text = await result.text();
        throw new Error(`Stability AI error: ${result.status} ${text}`);
    }

    const data = await result.json();
    // data.image は base64 文字列
    return `data:image/png;base64,${data.image}`;

  } catch (error) {
    console.error('Stability AI generation error:', error);
    // プレースホルダーまたはエラー画像を返す
    return 'https://placehold.co/600x400?text=Image+Generation+Failed';
  }
}
