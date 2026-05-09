module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text, direction } = req.body;
    
    // ① APIキーの見えない空白（スペース）を強制的に削除してURLの破損を防ぐ
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null; 

    if (!apiKey) {
        return res.status(500).json({ error: 'APIキーが見つかりません。' });
    }

    // ② 【絶対確実な正解】安定版(v1)と、全環境対応モデル(gemini-pro)を指定する
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

    const prompt = `
あなたは優秀なタイ語・日本語の翻訳・発音変換アシスタントです。
入力テキスト: "${text}"

上記のテキストを翻訳し、IPAと独自ルール（平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜）のカタカナ発音を付与して、JSON形式で返してください。
余計な解説は一切含めず、必ず以下のJSONフォーマットのみを出力してください。
{"translation": "翻訳結果", "ipa": "IPA発音", "katakana": "カタカナ発音"}
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        // エラーチェック
        if (!response.ok || data.error) {
            return res.status(500).json({ error: `Google APIエラー: ${data.error?.message || '不明なエラー'}` });
        }
        
        if (!data.candidates || data.candidates.length === 0) {
            const blockReason = data.promptFeedback?.blockReason || '不明な理由';
            return res.status(500).json({ error: `AIが回答を拒否しました（理由: ${blockReason}）` });
        }
        
        // テキストの抽出とJSONパース
        let resultText = data.candidates[0].content?.parts?.[0]?.text;
        if (!resultText) {
            return res.status(500).json({ error: 'AIの返答にテキストがありません。' });
        }

        resultText = resultText.replace(/```json/g, '').replace(/
```/g, '').trim();
        const jsonResult = JSON.parse(resultText);
        res.status(200).json(jsonResult);

    } catch (error) {
        console.error("詳細エラー:", error);
        res.status(500).json({ error: `システムエラー: ${error.message}` });
    }
}