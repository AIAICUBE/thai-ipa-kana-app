module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const { text } = req.body;
        // APIキーの空白等の混入を防ぐ
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null; 

        if (!apiKey) {
            return res.status(500).json({ error: 'APIキーが見つかりません(Vercelの環境変数を確認してください)' });
        }

        // 最も安定している1.5-flashモデル
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const prompt = `
あなたは優秀なタイ語翻訳アシスタントです。
入力テキスト: "${text}"
翻訳し、IPAと独自ルール（平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜）のカタカナを付与してJSONで返してください。
必ず以下のフォーマットのみを出力してください。
{"translation": "翻訳結果", "ipa": "IPA発音", "katakana": "カタカナ発音"}
`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const rawText = await response.text();
        
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            return res.status(500).json({ error: `Google APIからの返答が異常です: ${rawText.substring(0, 100)}` });
        }

        if (!response.ok || data.error) {
            return res.status(500).json({ error: `Google APIエラー: ${data.error?.message || '不明'}` });
        }
        
        if (!data.candidates || data.candidates.length === 0) {
            return res.status(500).json({ error: `AIが回答を拒否しました（詳細: ${JSON.stringify(data)}）` });
        }
        
        let resultText = data.candidates[0].content?.parts?.[0]?.text;
        if (!resultText) {
            return res.status(500).json({ error: 'AIの返答にテキストがありません。' });
        }

        // マークダウンの ```json などを取り除く
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(resultText);
        
        return res.status(200).json(jsonResult);

    } catch (error) {
        return res.status(500).json({ error: `サーバー内部エラー: ${error.message}` });
    }
}