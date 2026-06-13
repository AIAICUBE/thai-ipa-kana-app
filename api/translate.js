export default async function handler(req, res) {
  // CORS設定（Vercel等のサーバーでフロントと通信するために必須）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキー未設定" });

    // ==========================================
    // 1. 高精度翻訳・解析アクション (Gemini 2.5 Pro)
    // ==========================================
    if (action === 'translate') {
      const prompt = `あなたはタイ語と言語学の専門家です。
以下のルールを厳守して翻訳と解析を行ってください。

【単語リスト（words）の絶対厳守ルール】
1. "words" 配列には、必ず「タイ語」をベースに単語分割した結果のみを格納してください。
   - 【日本語からタイ語（日泰）の場合】：翻訳結果である「タイ語の訳文」を1単語ずつ分解すること。絶対に日本語の単語を "thai" フィールドに入れないこと。
   - 【タイ語から日本語（泰日）の場合】：入力された「タイ語の原文」を1単語ずつ分解すること。
2. 各単語の訳語（meaning）には、その文脈での正確な日本語の意味を記述してください。

【出力具体例（入力：お元気ですか？）】
{
  "full_translation": "สบายดีไหม",
  "full_ipa": "sa-baai-dii-mǎi",
  "full_katakana": "サバーイ→ ディー→ マイ↗",
  "source_lang": "ja",
  "target_lang": "th",
  "words": [
    {
      "thai": "สบาย",
      "reading": "サバーイ→",
      "ipa": "sa-baai",
      "meaning": "快適な、健康な"
    },
    {
      "thai": "ดี",
      "reading": "ディー→",
      "ipa": "dii",
      "meaning": "良い"
    },
    {
      "thai": "ไหม",
      "reading": "マイ↗",
      "ipa": "mǎi",
      "meaning": "〜ですか（疑問文末詞）"
    }
  ]
}

【その他の絶対ルール】
1. カタカナには必ず声調記号(→, ↑, ↓, ↘, ↗, 〜)を付けること。
2. 音節間はハイフン '-' で区切ること。
3. "words" には「タイ語単語」が必須。日本語の混入は禁止。
4. 返すのはJSONのみ。説明不要。

入力テキスト: ${text}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 0.1 
            }
          })
        }
      );

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error("AI応答なし");
      
      const cleanJson = resultText.replace(/
