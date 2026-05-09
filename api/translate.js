module.exports = async function handler(req, res) {
    // POSTリクエスト以外は弾く
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text, direction } = req.body;
    
    // Vercelの環境変数からAPIキーを取得
    const apiKey = process.env.GEMINI_API_KEY; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Geminiへの指示（プロンプト）
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
        
        // Geminiの返答からテキスト部分を抽出
        let resultText = data.candidates[0].content.parts[0].text;
        
        // GeminiがMarkdownのコードブロック(```json ... ```)で返してくることがあるため除去
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // JSONとして解析してフロントエンドへ返す
        const jsonResult = JSON.parse(resultText);
        res.status(200).json(jsonResult);

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: '翻訳処理に失敗しました。' });
    }
}