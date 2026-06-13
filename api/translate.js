export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) return res.status(200).json({ error: "APIキー未設定" });
    if (!text) return res.status(200).json({ error: "テキスト未指定" });

    // ==========================================
    // 🎙️ Gemini 2.5 Live TTS
    // ==========================================
    if (action === 'tts') {
      const isThai = /[\u0E00-\u0E7F]/.test(text);
      const voiceName = isThai ? "Aoede" : "Kore";
      const promptText = `Say clearly: ${text}`;

      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName }
            }
          }
        }
      };

      let response;
      let delay = 1000;
      // 最大5回指数バックオフでリトライ
      for (let i = 0; i < 5; i++) {
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }
          );
          if (response.ok) break;
        } catch (e) {
          if (i === 4) throw e;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }

      const data = await response.json().catch(() => null);

      if (data?.error) {
        return res.status(200).json({ error: data.error.message || JSON.stringify(data.error) });
      }
      if (!response.ok) {
        throw new Error(`TTS APIエラー (HTTP ${response.status}): ${data ? JSON.stringify(data) : '(本文なし)'}`);
      }

      const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const audioData = part?.data;
      const mimeType = part?.mimeType || "audio/L16;rate=24000";

      if (!audioData) throw new Error("音声データが空です");

      return res.status(200).json({ audio_data: audioData, mime_type: mimeType });
    }

    // ==========================================
    // 🧠 Gemini 2.5 Proによる超高精度翻訳＆言語解析
    // ==========================================
    const systemPrompt = `あなたはタイ語と言語学（特に日泰・泰日対照言語学）の第一人者です。
入力されたテキスト（日本語またはタイ語）を極めて自然かつ文脈に即した表現で翻訳し、その発音と単語構成を完璧に解析してください。

【翻訳・解析の超高精度化ルール】
1. 表面的な直訳は避け、タイ人・日本人が日常的に使う、最も自然なニュアンス、スラング、敬語のレベル（丁寧さ）、および情報構造（主題や焦点）を考慮した訳文を作成してください。
2. "words" 配列には、翻訳の方向（日本語からタイ語、タイ語から日本語）に関わらず、必ず「タイ語側」の文章を形態素解析（単語分割）した結果のみを正確に格納してください。
   - 【日本語からタイ語（日泰）の場合】：翻訳結果の「タイ語の訳文」を、意味のある最小単位の単語ごとに順番に分解して並べること。タイ語の単語フィールド("thai")に日本語を混ぜることは厳禁です。
   - 【タイ語から日本語（泰日）の場合】：入力された「タイ語の原文」を同様に分解して並べること。
3. 各単語の日本語訳（meaning）は、辞書的な一義ではなく、その文脈の中で実際に機能している自然な意味をピンポイントで記述してください。

【発音ルール】
1. "full_ipa" と "full_katakana" は、常に「タイ語側」全体の正確な発音を記述してください。
2. カタカナ表記には以下の声調記号を必ずマッピングしてください。
   （平声:→, 高声:↑, 低声:↓, 下がる:↘, 上がる:↗, 長音:〜）
3. 音節間はハイフン '-' で区切ってください。
4. 「ครับ/ค่ะ」は入力に含まれていない限り絶対に追加しないでください。`;

    const payload = {
      contents: [{ parts: [{ text: text }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        // responseSchemaにより、余分なマークダウン装飾(```json)を含まない純粋なJSONのみを返す
        responseSchema: {
          type: "OBJECT",
          properties: {
            full_translation: { type: "STRING" },
            full_ipa: { type: "STRING" },
            full_katakana: { type: "STRING" },
            source_lang: { type: "STRING" },
            target_lang: { type: "STRING" },
            words: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  thai: { type: "STRING" },
                  reading: { type: "STRING" },
                  ipa: { type: "STRING" },
                  meaning: { type: "STRING" }
                },
                required: ["thai", "reading", "ipa", "meaning"]
              }
            }
          },
          required: ["full_translation", "full_ipa", "full_katakana", "source_lang", "target_lang", "words"]
        }
      }
    };

    let response;
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
        if (response.ok) break;
      } catch (e) {
        if (i === 4) throw e;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }

    const data = await response.json().catch(() => null);

    if (data?.error) {
      return res.status(200).json({ error: data.error.message || JSON.stringify(data.error) });
    }
    if (!response.ok) {
      throw new Error(`翻訳APIエラー (HTTP ${response.status}): ${data ? JSON.stringify(data) : '(本文なし)'}`);
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("AI応答なし");

    let jsonContent = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      return res.status(200).json(JSON.parse(jsonContent));
    } catch (e) {
      const match = jsonContent.match(/\{[\s\S]*\}/);
      if (match) return res.status(200).json(JSON.parse(match[0]));
      throw new Error("JSONパース失敗");
    }

  } catch (err) {
    return res.status(200).json({ error: "エラー", detail: err.message });
  }
}
