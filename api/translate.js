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
以下のテキストを分析し、必ず指定のJSONスキーマのみを返してください。

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

    // ✅ 2026年最新の v1 エンドポイントと Gemini 3 Flash モデルに修正
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    // Google API 側でエラーが出た場合に詳細を表示する
    if (data.error) {
      return res.status(200).json({ 
        error: "Google APIエラー", 
        message: data.error.message 
      });
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("AIからの応答が空です");

    return res.status(200).json(JSON.parse(resultText));

  } catch (err) {
    return res.status(200).json({ error: "実行エラー", message: err.message });
  }
}