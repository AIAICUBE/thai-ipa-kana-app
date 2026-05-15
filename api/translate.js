export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキー未設定" });

    const prompt = `あなたはタイ語と言語学の専門家です。
入力された文字列が日本語ならタイ語へ、タイ語なら日本語へ翻訳してください。
【重要】「ครับ/ค่ะ」などの丁寧語は、入力に含まれていない限り絶対に追加しないでください。
必ず以下のJSONスキーマのみを返してください。

スキーマ:
{
  "full_translation": "翻訳後の文章全体",
  "full_ipa": "翻訳後テキスト全体のIPA表記",
  "full_katakana": "翻訳後テキスト全体のカタカナ表記（平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）",
  "source_lang": "入力言語 (ja か th)",
  "target_lang": "翻訳後言語 (ja か th)",
  "words": [
    {
      "thai": "タイ語単語",
      "reading": "カタカナ（声調記号付き）",
      "ipa": "IPA",
      "meaning": "意味"
    }
  ]
}

入力テキスト: ${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(200).json({ error: data.error.message });

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("AI応答なし");

    try {
      return res.status(200).json(JSON.parse(resultText));
    } catch {
      const match = resultText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const cleanJson = match ? match[1].trim() : resultText.trim();
      return res.status(200).json(JSON.parse(cleanJson));
    }
  } catch (err) {
    return res.status(200).json({ error: "エラー", detail: err.message });
  }
}