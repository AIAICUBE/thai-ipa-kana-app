export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキー未設定" });

    const prompt = `タイ語解析エキスパートとして動作してください。
入力テキストを分析し、必ず指定のJSONスキーマのみを返してください。説明は一切不要です。

スキーマ:
{
  "translation": "全体の日本語訳",
  "words": [
    {
      "thai": "タイ語単語",
      "reading": "読み（平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）",
      "ipa": "IPA",
      "meaning": "意味"
    }
  ]
}

入力: ${text}`;

    // ✅ v1beta を使用し、モデル名を確実に存在する 1.5-flash に固定します
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

    if (data.error) {
      // 💡 ここが重要：単に「エラー」と返すのではなく、Googleが言ってきた「理由」をフロントに渡します
      return res.status(200).json({ 
        error: "Google APIエラー", 
        message: data.error.message 
      });
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.status(200).json(JSON.parse(resultText || "{}"));

  } catch (err) {
    return res.status(200).json({ error: "サーバーエラー", message: err.message });
  }
}