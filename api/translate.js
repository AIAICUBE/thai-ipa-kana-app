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
日本語ならタイ語へ、タイ語なら日本語へ翻訳し、以下のルールで解析してください。

【解析の絶対ルール】
1. "words" 配列には、翻訳の方向（日→泰、泰→日）に関わらず、必ず「タイ語」の文章を正しく単語分割（形態素解析）した結果を格納してください。
   - 日本語からタイ語に訳した場合：生成された「タイ語の訳文」を1単語ずつに分解して説明すること（日本語の単語や意味のない記号をここに混ぜないこと）。
   - タイ語から日本語に訳した場合：入力された「タイ語の原文」を1単語ずつに分解して説明すること。
2. 各単語の訳語（meaning）は、その文章の文脈における正確で自然な意味を記述してください。
3. "full_ipa" と "full_katakana" も、常に「タイ語側」全体の正確な発音を記述してください。
4. カタカナ記号：平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜
5. 「ครับ/ค่ะ」は入力に含まれていない限り絶対に追加しないでください。

スキーマ:
{
  "full_translation": "全体の翻訳結果",
  "full_ipa": "タイ語全体の音節区切りIPA [例: sa-baai-dii-mǎi]",
  "full_katakana": "タイ語全体の声調記号付カタカナ [例: サバーイ→ ディー→ マイ↗]",
  "source_lang": "jaかth",
  "target_lang": "jaかth",
  "words": [
    {
      "thai": "タイ語の単語（例: สบาย）",
      "reading": "その単語の正確なカタカナ（記号付）（例: サバーイ→）",
      "ipa": "その単語の正確なIPA（音節間はハイフン）（例: sa-baai）",
      "meaning": "その単語の文脈に即した日本語の意味（例: 快適、元気）"
    }
  ]
}

入力テキスト: ${text}`;

    // 動作実績のあるモデル(gemini-2.5-flash)とエンドポイント(v1beta)を使用
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

    let jsonContent = resultText.trim();
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.split('```')[1].replace(/^json/, '').trim();
    }
    return res.status(200).json(JSON.parse(jsonContent));

  } catch (err) {
    return res.status(200).json({ error: "エラー", detail: err.message });
  }
}
