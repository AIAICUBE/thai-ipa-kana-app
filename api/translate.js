export default async function handler(req, res) {
  // CORS設定（ブラウザからの通信を許可）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return res.status(500).json({ error: 'APIキーがVercelに設定されていません' });
    }

    const prompt = `タイ語と日本語の翻訳専門家として、以下のテキストを翻訳・解析してください。
タイ語特有の「分かち書きなし」を考慮し、適切に分割して解析してください。
入力: "${text}"
必ず以下のJSON形式のみで返してください（余計な文字は一切不要）。
{"translation": "意味", "ipa": "IPA", "katakana": "カタカナ（平声:→,高声:↑,低声:↓,下がる:↘,上がる:↗,長音:〜を付ける）"}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text.replace(/```json|
```/g, '').trim();
    
    return res.status(200).json(JSON.parse(resultText));
  } catch (err) {
    return res.status(500).json({ error: 'Internal Error: ' + err.message });
  }
}