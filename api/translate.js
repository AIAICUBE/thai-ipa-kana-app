export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("APIキー未設定");

    // 音声生成(TTS)アクション
    if (action === 'tts') {
      const isThai = /[\u0E00-\u0E7F]/.test(text);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: isThai ? "Aoede" : "Kore" } } }
          }
        })
      });
      const data = await response.json();
      return res.status(200).json({ audio_data: data.candidates[0].content.parts[0].inlineData.data });
    }

    // 翻訳・解析アクション (Gemini 2.5 Pro)
    const prompt = `あなたは言語学の専門家です。入力されたテキストを翻訳し、必ず以下のJSON形式のみで解析結果を返してください。説明は不要です。

【必須ルール】
- "words"は必ず「タイ語」をベースに形態素解析（単語分割）した結果を格納する。日本語の単語をタイ語フィールドに入れないこと。
- カタカナは声調記号(→↑↓↘↗〜)を必ず付与すること。
- 音節間はハイフン '-' で区切ること。
- 「ครับ/ค่ะ」は入力に無い限り追加しないこと。

【JSONスキーマ】
{
  "full_translation": "string",
  "full_ipa": "string (例: sa-baai-dii)",
  "full_katakana": "string (例: サバーイ→ ディー→)",
  "source_lang": "jaかth",
  "target_lang": "jaかth",
  "words": [{"thai": "string", "reading": "string", "ipa": "string", "meaning": "string"}]
}

入力テキスト: ${text}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      })
    });
    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    const cleanJson = resultText.replace(/
http://googleusercontent.com/immersive_entry_chip/0
