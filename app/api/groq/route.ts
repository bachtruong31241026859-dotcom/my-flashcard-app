import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { word, mode } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Trường "word" không được để trống' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GROQ_API_KEY trong Environment Variables' },
        { status: 500 }
      );
    }

    const currentMode = mode || 'ielts'; // 'daily' | 'ielts' | 'business'

    let modeInstruction = '';
    if (currentMode === 'daily') {
      modeInstruction = `
      TARGET: Daily Communication & Street English.
      - Return 3 examples with levels: "Cơ bản (A2)", "Tự nhiên (B1-B2)", "Thành ngữ / Lóng (C1)".
      - Focus on real-life dialogues, slang, travel, chatting, and social situations.
      - If the word is profanity or slang (e.g. "bitch"), explain its nuances (e.g. offensive vs friendly banter vs idiomatic use like "life's a bitch").
      `;
    } else if (currentMode === 'business') {
      modeInstruction = `
      TARGET: Business & Workplace English.
      - Return 3 examples with levels: "Sơ cấp Công sở", "Chuyên nghiệp", "Quản lý / Đàm phán".
      - Focus on emails, meetings, reports, negotiations, and workplace interaction.
      - If the word is slang, vulgar, or inappropriate for work (e.g. "bitch"), explicitly mark it as NOT suitable for formal work and provide examples of proper professional alternatives (paraphrasing).
      `;
    } else {
      // IELTS Mode
      modeInstruction = `
      TARGET: IELTS Examination (Academic & General).
      - Return 3 examples with levels EXACTLY as: "Band 5.5", "Band 6.5", "Band 7.5".
      - Focus on essay writing (Task 2), speaking answers, and formal vocabulary.
      - If the word is informal or slang (e.g. "bitch"), note that it's informal/unsuitable for Writing, and show formal academic alternatives in the examples.
      `;
    }

    const prompt = `
    You are an expert English language tutor.
    Analyze the word: "${word}".
    Mode selected: ${currentMode}.

    ${modeInstruction}

    Return a strictly valid JSON object following this exact schema:

    {
      "word": "${word}",
      "ipa": "Phonetic transcription, e.g., /ˈmɪt.ɪ.ɡeɪt/",
      "partOfSpeech": "verb / noun / adjective / slang / etc.",
      "vietnamese_meaning": "Nghĩa tiếng Việt ngắn gọn, chính xác",
      "mode": "${currentMode}",
      "examples": [
        {
          "band": "Level/Band tag (e.g., 'Band 5.5' or 'Cơ bản (A2)' or 'Sơ cấp')",
          "en": "English example sentence",
          "vi": "Dịch nghĩa tiếng Việt"
        },
        {
          "band": "Level/Band tag (e.g., 'Band 6.5' or 'Tự nhiên (B1)' or 'Chuyên nghiệp')",
          "en": "English example sentence",
          "vi": "Dịch nghĩa tiếng Việt"
        },
        {
          "band": "Level/Band tag (e.g., 'Band 7.5' or 'Thành ngữ / Lóng' or 'Quản lý')",
          "en": "English example sentence",
          "vi": "Dịch nghĩa tiếng Việt"
        }
      ]
    }

    CRITICAL RULES:
    1. Output MUST be ONLY pure JSON (no markdown \`\`\`json wrappers, no extra text).
    2. Make sure explanations in Vietnamese are natural.
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Groq API Error:', errBody);
      return NextResponse.json(
        { error: `Groq API lỗi HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsedData = JSON.parse(content);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('API Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'Lỗi xử lý server' },
      { status: 500 }
    );
  }
}
