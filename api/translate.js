// api/translate.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("APIキーがサーバーに設定されていません");

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

    // 翻訳・解析
    const prompt = `あなたはタイ語と言語学の専門家です。テキストを翻訳し、JSONのみで返してください。
    {
      "full_translation": "...",
      "full_ipa": "...",
      "full_katakana": "...",
      "words": [{"thai": "...", "reading": "...", "ipa": "...", "meaning": "..."}]
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
    const resultText = data.candidates[0].content.parts[0].text;
    const cleanJson = resultText.replace(/
http://googleusercontent.com/immersive_entry_chip/0

この2つのファイルを使用してください。以前のコードを置き換える形でファイルに上書きすれば、すべて正常に機能します。
