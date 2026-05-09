// api/translate.js
const fetch = require('node-fetch'); // Vercelの標準環境で動作します

module.exports = async function handler(req, res) {
    // どんなエラーが起きても必ずJSONを返すためのガード
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'POSTメソッドのみ受け付けています' });
        }

        const { text } = req.body;
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

        if (!apiKey) {
            return res.status(500).json({ error: 'APIキーが設定されていません。Vercelの環境変数を確認してください。' });
        }

        // タイ語は単語の区切りがないため、AIに正確な分割と声調（5声）の判定を依頼します
        const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを解析し、日本語の意味、IPA、および独自のカタカナ表記を出力してください。
タイ語は単語の境界がないため、文脈から適切に区切って解析してください。

入力テキスト: "${text}"

【カタカナ表記のルール】
平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜 を必ず使用してください。

【出力形式】
必ず以下のJSON形式のみで返し、余計な説明は含めないでください。
{"translation": "日本語の意味", "ipa": "IPA表記", "katakana": "カタカナ表記"}
`;

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
        // AIがマークダウン記法で返してきた場合のゴミ掃除
        resultText = resultText.replace(/```json/g, '').replace(/
```/g, '').trim();
        
        const jsonResult = JSON.parse(resultText);
        return res.status(200).json(jsonResult);

    } catch (err) {
        // ここが重要：エラーをテキストではなくJSONで返す
        console.error(err);
        return res.status(500).json({ error: 'サーバー内部エラーが発生しました: ' + err.message });
    }
};