export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキーが設定されていません。" });

    const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを分析し、必ず指定のJSONスキーマのみを返してください。説明文やコードブロックは一切不要です。

スキーマ:
{
  "translation": "全体の日本語訳",
  "words": [
    {
      "thai": "タイ語単語",
      "reading": "カタカナ（平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）",
      "ipa": "IPA表記",
      "meaning": "意味"
    }
  ]
}

入力テキスト: ${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json" // ✅ これが勝利の鍵
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(200).json({ error: data.error.message });

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.status(200).json(JSON.parse(resultText || "{}"));

  } catch (err) {
    return res.status(200).json({ error: "サーバーエラー", message: err.message });
  }
}