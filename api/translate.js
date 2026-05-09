export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return res.status(200).json({ error: "APIキーが設定されていません。" });
    }

    // ✅ キー名を明示してindex.htmlと一致させる
    const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを分析し、必ず下記JSONだけを返してください。説明文・マークダウン・コードブロックは不要です。

{
  "translation": "日本語訳",
  "ipa": "文全体のIPA表記",
  "katakana": "声調記号付きカタカナ読み（平声:→ 高声:↑ 低声:↓ 下がる:↘ 上がる:↗ 長音:〜）"
}

入力テキスト: ${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" } // ✅ JSONのみ返すよう強制
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ error: data.error.message });
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      return res.status(200).json({ error: "Geminiからレスポンスが取得できませんでした。" });
    }

    // ✅ パース失敗時のフォールバック付き
    try {
      return res.status(200).json(JSON.parse(resultText));
    } catch {
      const match = resultText.match(/```(?:json)?\s*([\s\S]*?)```/);
      return res.status(200).json(JSON.parse(match ? match[1].trim() : resultText.trim()));
    }

  } catch (err) {
    return res.status(200).json({
      error: "サーバー内部でエラーが発生しました",
      message: err.message
    });
  }
}
