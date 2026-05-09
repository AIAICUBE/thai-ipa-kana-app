const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'POSTのみ許可されています' });
        }

        const { text } = req.body;
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

        if (!apiKey) {
            return res.status(500).json({ error: 'APIキーが設定されていません。' });
        }

        // タイ語の「分かち書きがない」という特徴を考慮して解析を依頼します
        const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを解析し、日本語の意味、IPA、カタカナ表記を出力してください。

入力テキスト: "${text}"

【カタカナ表記のルール】
平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜 を必ず付けてください。

【出力形式】
必ず以下のJSON形式のみで返し、余計な説明は含めないでください。
{"translation": "日本語の意味", "ipa": "IPA表記", "katakana": "カタカナ表記"}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: 'Google API Error: ' + data.error.message });
        }

        let resultText = data.candidates[0].content.parts[0].text;
        
        // --- 修正箇所: 正規表現の閉じ忘れを直し、安全にJSONを抽出します ---
        resultText = resultText.replace(/```json/g, '').replace(/
```/g, '').trim();
        
        const jsonResult = JSON.parse(resultText);
        return res.status(200).json(jsonResult);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'サーバーエラー: ' + err.message });
    }
};