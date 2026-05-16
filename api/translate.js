export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキー未設定" });

    // 他の完璧なロジックはそのまま、単語リスト(words)のタイ語強制ルールのみを極限まで強化
    const prompt = `あなたはタイ語と言語学の専門家です。
日本語ならタイ語へ、タイ語なら日本語へ翻訳し、以下のルールで解析してください。

【単語リスト（words）の絶対厳守ルール】
1. "words" 配列には、翻訳の方向（日本語からタイ語、タイ語から日本語）に関わらず、必ず「タイ語の文章」をベースに単語分割（形態素解析）した結果を格納してください。
   - 【日本語からタイ語（日泰）の場合】：翻訳結果である「タイ語の訳文」を1単語ずつに分解して並べること。絶対に日本語の単語（例:「元気」や「ですか」）を "thai" に入れたり、日本語をベースに分割したりしないでください。
   - 【タイ語から日本語（泰日）の場合】：入力された「タイ語の原文」を1単語ずつに分解して並べること。
2. 各単語の訳語（meaning）には、その文章の文脈における正確で自然な日本語の意味を記述してください。

【その他の絶対ルール】
1. "full_ipa" と "full_katakana" は、常に「タイ語側」全体の正確な発音を記述してください。
2. カタカナ表記には以下の声調記号を必ず付けてください。
   （平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）
3. 音節間はハイフン '-' で区切ってください。
4. 「ครับ/ค่ะ」は入力に含まれていない限り絶対に追加しないでください。

スキーマ:
{
  "full_translation": "全体の翻訳結果",
  "full_ipa": "タイ語全体の正確な音節区切りIPA",
  "full_katakana": "タイ語全体の正確な声調記号付カタカナ",
  "source_lang": "jaかth",
  "target_lang": "jaかth",
  "words": [
    {
      "thai": "タイ語の単語のみ（日本語は絶対に禁止。例: สบาย）",
      "reading": "その単語の正確なカタカナ（声調記号付）（例: サバーイ→）",
      "ipa": "その単語の正確なIPA（音節間はハイフン）（例: sa-baai）",
      "meaning": "その単語の文脈に即した正確な日本語の意味（例: 快適、元気）"
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

    let jsonContent = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      return res.status(200).json(JSON.parse(jsonContent));
    } catch (e) {
      const match = jsonContent.match(/\{[\s\S]*\}/);
      if (match) return res.status(200).json(JSON.parse(match[0]));
      throw new Error("JSONパース失敗");
    }

  } catch (err) {
    return res.status(200).json({ error: "エラー", detail: err.message });
  }
}
