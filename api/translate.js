export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキー未設定" });

    // IPAの可読性を極限まで高めるための指示を追加
    const prompt = `あなたはタイ語と言語学の専門家です。
入力された文字列が日本語ならタイ語へ、タイ語なら日本語へ翻訳してください。

【IPA表記の厳格ルール（人間用）】
・IPAは必ず [ ] で囲んでください。
・単語と単語の間には半角スペースを入れてください。
・音節の間は必ずハイフン '-' で区切ってください（例: [sa-wàt-dii]）。
・声調記号をIPA標準の記号（à, á, â, ǎ）を用いて、全ての音節に付けてください。

【その他ルール】
・「ครับ/ค่ะ」などの丁寧語は、入力に含まれていない限り絶対に追加しないでください。
・解析結果は、必ず以下のJSONスキーマのみを返してください。

スキーマ:
{
  "full_translation": "翻訳後の文章全体",
  "full_ipa": "読みやすく区切られたIPA表記（例: [sa-wàt-dii]）",
  "full_katakana": "文全体のカタカナ表記（平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）",
  "source_lang": "入力言語 (ja/th)",
  "target_lang": "翻訳後言語 (ja/th)",
  "words": [
    {
      "thai": "単語",
      "reading": "カタカナ（声調記号付き）",
      "ipa": "区切られたIPA",
      "meaning": "意味"
    }
  ]
}

対象テキスト: ${text}`;

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
      let jsonContent = resultText.trim();
      if (jsonContent.includes('```')) {
        jsonContent = jsonContent.split('```')[1].replace(/^json/, '').trim();
      }
      return res.status(200).json(JSON.parse(jsonContent));
    } catch (e) {
      throw new Error("解析エラー");
    }
  } catch (err) {
    return res.status(200).json({ error: "サーバーエラー", detail: err.message });
  }
}
