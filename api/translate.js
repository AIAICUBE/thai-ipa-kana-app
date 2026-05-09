// api/translate.js
module.exports = async function handler(req, res) {
  // CORSヘッダーの設定（ブラウザからの通信を許可）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return res.status(200).json({ error: 'VercelのEnvironment VariablesにGEMINI_API_KEYが設定されていません。' });
    }

    // 2026年現在のAI技術を使い、タイ語の「空白がない」文章を文脈から解析させます
    const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを翻訳し、IPA、独自のカタカナ表記をJSONで出力してください。
タイ語は分かち書きがないため、適切に分割して解析してください。

入力: "${text}"

【カタカナ表記ルール】
平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜 
全ての単語に声調記号を付けてください。

【出力形式】
{"translation": "日本語の意味", "ipa": "IPA表記", "katakana": "カタカナ表記"}`;

    // Node.js 18以上で標準搭載された fetch を使用（require不要）
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(200).json({ error: 'Google API Error: ' + data.error.message });
    }

    let resultText = data.candidates[0].content.parts[0].text;
    const cleanJson = resultText.replace(/```json/g, '').replace(/
```/g, '').trim();
    
    // 成功時はJSONを返す
    res.status(200).json(JSON.parse(cleanJson));

  } catch (err) {
    // 500エラーを避けるため、あえて200でエラー内容を返します
    res.status(200).json({ 
      error: '実行中にエラーが発生しました',
      details: err.message 
    });
  }
};