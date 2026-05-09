export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    const prompt = `タイ語は分かち書きがなく、5つの声調（平声、低声、高声、下がる、上がる）を持つ言語です。
以下のテキストを適切に分割・解析し、JSONでのみ返してください。
入力: "${text}"
【ルール】カタカナ表記には必ず声調記号（平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）を付けてください。
{"translation": "日本語の意味", "ipa": "IPA", "katakana": "声調記号付きカタカナ"}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const result = data.candidates[0].content.parts[0].text.replace(/```json|
```/g, '').trim();
    res.status(200).json(JSON.parse(result));
  } catch (err) {
    res.status(200).json({ error: "解析エラー: " + err.message });
  }
}