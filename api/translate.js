// api/translate.js
module.exports = async function handler(req, res) {
  // ブラウザからのアクセスを許可する設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text } = req.body;
    // 空白を削除してAPIキーを読み込む
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

    if (!apiKey) {
      return res.status(500).json({ error: 'APIキーが設定されていません' });
    }

    // タイ語は単語間にスペースがなく、文末に句読点も置かない特徴があります
    const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを翻訳し、IPA、独自のカタカナ表記をJSONで出力してください。
タイ語は分かち書きがないため、適切に分割して解析してください。

入力: "${text}"

【カタカナ表記ルール】
平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜 
全ての単語に声調記号を付けてください。

【出力形式】
{"translation": "日本語の意味", "ipa": "IPA表記", "katakana": "カタカナ表記"}`;

    // Vercel Node.js 18+ の標準 fetch を使用
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: 'Gemini API Error: ' + data.error.message });
    }

    // AIの返答からJSON部分を抽出
    let resultText = data.candidates[0].content.parts[0].text;
    const cleanJson = resultText.replace(/```json/g, '').replace(/
```/g, '').trim();
    
    return res.status(200).json(JSON.parse(cleanJson));
  } catch (err) {
    return res.status(500).json({ error: 'システムエラー: ' + err.message });
  }
};