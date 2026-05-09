export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(500).json({ error: 'APIキーが設定されていません' });

    // タイ語は5つの声調（平声、低声、高声、下がる、上がる）を持つ言語です
    const prompt = `あなたはタイ語と言語学の専門家です。
以下のテキストを翻訳し、IPA、カタカナ表記をJSONで出力してください。
タイ語は分かち書きがないため、適切に分割して解析してください。

入力: "${text}"

【カタカナ表記ルール】
平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜 
※声調記号を必ず全ての単語に付けてください。

【出力形式】
{"translation": "...", "ipa": "...", "katakana": "..."}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.error) return res.status(500).json({ error: data.error.message });

        let resultText = data.candidates[0].content.parts[0].text;
        // JSON以外の余計な文字を掃除
        const cleanJson = resultText.replace(/```json/g, '').replace(/
```/g, '').trim();
        
        res.status(200).json(JSON.parse(cleanJson));
    } catch (e) {
        res.status(500).json({ error: 'システムエラー: ' + e.message });
    }
}