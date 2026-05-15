export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキーが設定されていません。" });

    const prompt = `あなたはタイ語と言語学の専門家です。
入力された文字列が日本語ならタイ語へ、タイ語なら日本語へ翻訳してください。
【重要ルール】
・「ครับ/ค่ะ」などの丁寧語（末尾詞）は、入力に含まれていない限り絶対に追加しないでください。
・解析結果は、必ず以下のJSONスキーマのみを返してください。説明文は一切不要です。

スキーマ:
{
  "full_translation": "翻訳後の文章全体",
  "full_ipa": "翻訳後テキスト全体のIPA表記",
  "full_katakana": "翻訳後テキスト全体のカタカナ表記（平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）",
  "source_lang": "入力言語 (ja か th)",
  "target_lang": "翻訳後言語 (ja か th)",
  "words": [
    {
      "thai": "タイ語単語",
      "reading": "カタカナ（声調記号付き）",
      "ipa": "IPA",
      "meaning": "意味"
    }
  ]
}

入力テキスト: ${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({
        error: "Google APIエラー",
        detail: data.error.message || "原因不明のエラー"
      });
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("AIの応答が空です");

    try {
      return res.status(200).json(JSON.parse(resultText));
    } catch {
      const match = resultText.match(/
http://googleusercontent.com/immersive_entry_chip/0

---

### 2. 表示側：`index.html`

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>タイ語 翻訳・発音解析ツール</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #f0f2f5; color: #333; }
        .box { 
            max-width: 500px; margin: 0 auto; background: #fff; padding: 25px; 
            border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); height: auto;
        }
        h2 { font-size: 1.2rem; text-align: center; margin-bottom: 20px; }
        textarea { 
            width: 100%; height: 100px; padding: 12px; border: 1px solid #ddd; 
            border-radius: 8px; box-sizing: border-box; font-size: 18px; 
        }
        .btn-row { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 5px; }
        .speak-btn { background: none; border: none; cursor: pointer; font-size: 24px; color: #3498db; }
        #main-btn { 
            width: 100%; padding: 15px; background: #00b894; color: white; 
            border: none; border-radius: 8px; cursor: pointer; 
            font-size: 16px; font-weight: bold; margin-top: 10px;
        }
        .res-box { margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px; display: none; }
        .full-card { background: #e8f4f8; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #3498db; }
        .full-text { font-size: 22px; font-weight: bold; color: #2c3e50; }
        .detail-line { margin-top: 10px; font-size: 14px; color: #555; border-top: 1px solid #d4e6f1; padding-top: 8px; line-height: 1.5; }
        .word-card { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #00b894; }
        .thai-word { font-size: 24px; font-weight: bold; color: #00b894; }
    </style>
</head>
<body>
    <div class="box">
        <h2>タイ語 翻訳・発音解析</h2>
        <textarea id="input" placeholder="タイ語または日本語を入力..."></textarea>
        <div class="btn-row">
            <span style="font-size: 12px; color: #888;">入力の発音:</span>
            <button class="speak-btn" onclick="speakInput()">🔊</button>
        </div>

        <button id="main-btn" onclick="run()">解析・翻訳する</button>

        <div id="result" class="res-box">
            <div class="full-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <span id="full-trans" class="full-text"></span>
                    <button id="speak-output-btn" class="speak-btn">🔊</button>
                </div>
                <div class="detail-line"><strong>IPA全文:</strong> <br><span id="full-ipa"></span></div>
                <div class="detail-line"><strong>カタカナ全文:</strong> <br><span id="full-katakana"></span></div>
            </div>
            <div id="word-list"></div>
        </div>
    </div>

    <script>
        function speak(text, lang) {
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            const uttr = new SpeechSynthesisUtterance(text);
            uttr.lang = lang === 'th' ? 'th-TH' : 'ja-JP';
            uttr.rate = 0.9;
            window.speechSynthesis.speak(uttr);
        }

        function speakInput() {
            const text = document.getElementById('input').value.trim();
            if (!text) return;
            const isThai = /[\u0E00-\u0E7F]/.test(text);
            speak(text, isThai ? 'th' : 'ja');
        }

        async function run() {
            const btn = document.getElementById('main-btn');
            const inputVal = document.getElementById('input').value.trim();
            if(!inputVal) return;

            btn.disabled = true; btn.textContent = "解析中...";
            document.getElementById('result').style.display = 'none';

            try {
                const res = await fetch('/api/translate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ text: inputVal })
                });
                const data = await res.json();
                if(data.error) throw new Error(data.error + (data.detail ? ": " + data.detail : ""));

                document.getElementById('full-trans').innerText = data.full_translation;
                document.getElementById('full-ipa').innerText = data.full_ipa;
                document.getElementById('full-katakana').innerText = data.full_katakana;

                document.getElementById('speak-output-btn').onclick = () => {
                    speak(data.full_translation, data.target_lang);
                };

                const list = document.getElementById('word-list');
                list.innerHTML = data.words.map(w => `
                    <div class="word-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="thai-word">${w.thai}</span>
                            <button class="speak-btn" onclick="speak('${w.thai}', 'th')">🔊</button>
                        </div>
                        <div style="color:#666; font-size:14px; margin-top:5px;">
                            ${w.reading} | ${w.ipa}
                        </div>
                        <div style="margin-top:8px;">${w.meaning}</div>
                    </div>
                `).join('');
                
                document.getElementById('result').style.display = 'block';
            } catch (e) { alert("エラー: " + e.message); }
            finally { btn.disabled = false; btn.textContent = "解析・翻訳する"; }
        }
    </script>
</body>
</html>
