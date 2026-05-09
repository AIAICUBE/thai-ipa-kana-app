export default async function handler(req, res) {
  // CORSガード（ブラウザからの通信を許可）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = await req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキーが設定されていません。" });

    const prompt = `あなたはタイ語翻訳の専門家です。
以下のテキストを翻訳し、IPA、独自のカタカナ表記をJSONで出力してください。
タイ語は分かち書きがないため、適切に分割して解析してください。

入力: "${text}"

【カタカナ表記ルール】
平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜 
全ての単語に声調記号を付けてください。

【出力形式】
{"translation": "...", "ipa": "...", "katakana": "..."}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    
    if (data.error) return res.status(200).json({ error: "Google API Error: " + data.error.message });

    let result = data.candidates[0].content.parts[0].text.replace(/```json|
```/g, '').trim();
    return res.status(200).json(JSON.parse(result));

  } catch (err) {
    // 500エラーを回避するため、あえて200で詳細を返す
    return res.status(200).json({ error: "実行エラー", message: err.message });
  }
}