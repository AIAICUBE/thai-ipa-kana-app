export default async function handler(req, res) {
  // ブラウザからのアクセスを許可
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = await req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: 'APIキーが設定されていません。' });

    // タイ語は分かち書きがないため、AIに文脈に応じた分割を依頼します
    const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを翻訳し、IPA、独自のカタカナ表記をJSONで出力してください。
入力: "${text}"

【カタカナ表記ルール】
平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜 
全ての単語に声調記号を付けてください。

【出力形式】
{"translation": "日本語の意味", "ipa": "IPA表記", "katakana": "カタカナ表記"}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    if (data.error) return res.status(200).json({ error: data.error.message });

    // AIの返答からJSONを抽出
    let result = data.candidates[0].content.parts[0].text;
    const cleanJson = result.replace(/```json/g, '').replace(/
```/g, '').trim();
    
    return res.status(200).json(JSON.parse(cleanJson));

  } catch (err) {
    // 500エラーで沈黙するのを防ぐため、200でエラー内容を返します
    return res.status(200).json({ error: 'サーバー内部エラー: ' + err.message });
  }
}