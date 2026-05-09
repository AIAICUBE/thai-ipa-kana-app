export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(500).json({ error: 'APIキーがVercelに設定されていません。' });

    // 安定版の1.5-flashを使用
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `あなたはタイ語翻訳の専門家です。タイ語には句読点や分かち書きがないため、文脈を考慮して適切に分割してください。
入力: "${text}"
以下のルールで翻訳・発音記号化し、JSONでのみ返してください。
1. 日本語の意味
2. IPA記号
3. カタカナ（平声:→、高声:↑、低声:↓、下がる:↘、上がる:↗、長音:〜 を付ける）
{"translation": "...", "ipa": "...", "katakana": "..."}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if (data.error) return res.status(500).json({ error: data.error.message });

        let resultText = data.candidates[0].content.parts[0].text;
        resultText = resultText.replace(/```json/g, '').replace(/
```/g, '').trim();
        
        res.status(200).json(JSON.parse(resultText));
    } catch (e) {
        res.status(500).json({ error: 'サーバーエラー: ' + e.message });
    }
}