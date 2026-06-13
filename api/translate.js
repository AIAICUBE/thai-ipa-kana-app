export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) throw new Error("APIキー未設定");

    // 音声生成 (TTS)
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

    // 翻訳・解析 (Gemini 2.5 Pro)
    const prompt = `あなたは言語学の専門家です。入力テキストを翻訳し、以下のJSON構造のみで返してください。
    {
      "full_translation": "翻訳結果",
      "full_ipa": "音節ハイフン区切りIPA",
      "full_katakana": "声調記号付きカタカナ",
      "words": [{"thai": "単語", "reading": "カナ", "ipa": "IPA", "meaning": "意味"}]
    }
    入力: ${text}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      })
    });
    
    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // JSONのクリーンアップ（Markdown記法が含まれる場合に対応）
    const cleanJson = resultText.replace(/
http://googleusercontent.com/immersive_entry_chip/0
