<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>タイ語単語 解析ツール</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #f0f2f5; color: #333; }
        .box { 
            max-width: 500px; 
            margin: 0 auto; 
            background: #fff; 
            padding: 25px; 
            border-radius: 12px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            height: auto; /* 自動で伸びる */
        }
        h2 { font-size: 1.2rem; margin-bottom: 20px; color: #2d3436; }
        textarea { 
            width: 100%; 
            height: 80px; 
            padding: 12px; 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            box-sizing: border-box; 
            font-size: 18px; /* 入力文字を大きく */
        }
        button { 
            width: 100%; 
            padding: 15px; 
            background: #00b894; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: bold; 
            margin-top: 10px;
        }
        .res-box { 
            margin-top: 20px; 
            border-top: 1px solid #eee; 
            padding-top: 20px; 
            display: none; 
        }
        .word-card { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 10px; 
        }
        .thai-text { font-size: 28px; font-weight: bold; color: #00b894; }
        .info { margin: 5px 0; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="box">
        <h2>タイ語 単語解析</h2>
        <textarea id="input" placeholder="解析したいタイ語を入力..."></textarea>
        <button id="btn" onclick="run()">解析する</button>

        <div id="result" class="res-box">
            <div id="word-list"></div>
        </div>
    </div>

    <script>
        async function run() {
            const btn = document.getElementById('btn');
            const text = document.getElementById('input').value.trim();
            if(!text) return;

            btn.disabled = true; btn.textContent = "解析中...";
            document.getElementById('result').style.display = 'none';

            try {
                const res = await fetch('/api/translate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ text })
                });
                const data = await res.json();
                if(data.error) throw new Error(data.error);

                const list = document.getElementById('word-list');
                list.innerHTML = data.words.map(w => `
                    <div class="word-card">
                        <div class="thai-text">${w.thai}</div>
                        <div class="info"><strong>読み:</strong> ${w.reading}</div>
                        <div class="info"><strong>IPA:</strong> ${w.ipa}</div>
                        <div style="margin-top:10px; font-size:16px;">${w.meaning}</div>
                    </div>
                `).join('');
                
                document.getElementById('result').style.display = 'block';
            } catch (e) { alert(e.message); }
            finally { btn.disabled = false; btn.textContent = "解析する"; }
        }
    </script>
</body>
</html>