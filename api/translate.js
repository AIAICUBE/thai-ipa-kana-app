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
入力された文字列が日本語ならタイ語へ、タイ語なら日本語へ翻訳してください。
丁寧語の「ครับ/ค่ะ」などは、入力に含まれていない限り絶対に追加しないでください。
解析結果は、以下のJSONスキーマのみを返してください。

スキーマ:
{
  "full_translation": "翻訳後の文章全体",
  "full_ipa": "文全体のIPA表記",
  "full_katakana": "文全体のカタカナ表記（声調記号付き：平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）",
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

    // あなたが提示した「動く設定」をそのまま使用
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
      return res.status(200).json({
        error: "Google APIエラー",
        detail: data.error.message || "原因不明のエラー"
      });
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("AIの応答が空です");

    try {
      return res.status(200).json(JSON.parse(resultText));
    } catch {
      const match = resultText.match(/
http://googleusercontent.com/immersive_entry_chip/0

これで、あなたが大事にしている**「動作実績のある構成」**を守ったまま、新機能をすべて追加できました。Vercelにプッシュして、スピーカーをオンにして使ってみてください！
