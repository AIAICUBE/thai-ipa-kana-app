// api/translate.js
module.exports = async function handler(req, res) {
  // ブラウザからのアクセス許可 (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return res.status(200).json({ error: 'Vercel の Environment Variables に GEMINI_API_KEY が設定されていません。' });
    }

    // タイ語は文脈で意味や人称代名詞（pǒm など）が変わるため、AIによる解析が有効です
    const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを翻訳し、IPA、独自のカタカナ表記をJSONで出力してください。
タイ語は分かち書きがないため、適切に分割して解析してください。

入力: "${text}"

【カタカナ表記ルール】
平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜 
全ての単語に声調記号を付けてください。

【出力形式】
{"translation": "日本語の意味", "ipa": "IPA表記", "katakana": "カタカナ表記"}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(200).json({ error: 'Google APIからのエラー: ' + data.error.message });
    }

    if (!data.candidates || data.candidates.length === 0) {
      return res.status(200).json({ error: 'AIが回答を生成できませんでした（セーフティフィルター等）。' });
    }

    let resultText = data.candidates[0].content.parts[0].text;
    const cleanJson = resultText.replace(/```json/g, '').replace(/
```/g, '').trim();
    
    return res.status(200).json(JSON.parse(cleanJson));

  } catch (err) {
    // ここでエラーを捕まえて、500ではなく200で詳細を返します
    return res.status(200).json({ 
      error: 'プログラム実行中にエラーが発生しました',
      message: err.message,
      stack: err.stack 
    });
  }
};