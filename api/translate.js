module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text, direction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; 

    // ① APIキーがVercelにちゃんと設定されているかチェック
    if (!apiKey) {
        return res.status(500).json({ error: 'APIキーが見つかりません。VercelのEnvironment Variablesの設定を確認してください。' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

        // ② Google(Gemini)のAPI自体からエラーで怒られていないかチェック
        if (!response.ok || data.error) {
            return res.status(500).json({ error: `Google APIエラー: ${data.error?.message || '不明なエラー'}` });
        }
        
        let resultText = data.candidates[0].content.parts[0].text;
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // ③ AIの返答が正しいJSONフォーマットになっているかチェック
        const jsonResult = JSON.parse(resultText);
        res.status(200).json(jsonResult);

    } catch (error) {
        console.error("詳細エラー:", error);
        // ④ それ以外の予期せぬエラーが起きた場合、その中身を画面に返す
        res.status(500).json({ error: `システムエラー: ${error.message}` });
    }
}
