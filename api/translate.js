<!-- script部分のみ更新 -->
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
            
            if(data.error) {
                // 具体的なエラー理由（detail）を表示
                throw new Error(`${data.error}\n詳細: ${data.detail || "不明な理由"}`);
            }

            document.getElementById('main-trans').innerText = "全体訳: " + data.translation;
            const list = document.getElementById('word-list');
            list.innerHTML = "";
            
            data.words.forEach(w => {
                list.innerHTML += `
                    <div class="word-card">
                        <div class="thai-text">${w.thai}</div>
                        <div style="color: #666; font-size: 0.9em;">
                            読み: ${w.reading} | IPA: ${w.ipa}
                        </div>
                        <div style="margin-top: 5px;">${w.meaning}</div>
                    </div>`;
            });
            document.getElementById('result').style.display = 'block';
        } catch (e) { 
            alert(e.message); 
        } finally { 
            btn.disabled = false; btn.textContent = "解析する"; 
        }
    }
</script>