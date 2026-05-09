export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: 'APIキーが設定されていません。' });

    // タイ語は分かち書きがないため、AIによる文脈判断が非常に有効です
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

    let result = data.candidates[0].content.parts[0].text.replace(/```json|
```/g, '').trim();
    return res.status(200).json(JSON.parse(result));

  } catch (err) {
    return res.status(200).json({ error: 'System Error: ' + err.message });
  }
}