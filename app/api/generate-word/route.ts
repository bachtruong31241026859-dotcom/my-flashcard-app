import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { word } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Từ vựng không được để trống' }, { status: 400 });
    }

    const cleanWord = word.trim().toLowerCase();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json(
        { error: 'Chưa tìm thấy GEMINI_API_KEY trên Vercel. Hãy kiểm tra Environment Variables!' },
        { status: 500 }
      );
    }

    const prompt = `Bạn là một chuyên gia IELTS. Hãy phân tích từ tiếng Anh "${cleanWord}" và trả về duy nhất một chuỗi JSON hợp lệ theo đúng cấu trúc sau (không kèm markdown codeblock \`\`\`json):
{
  "word": "${cleanWord}",
  "ipa": "/phiên âm/",
  "part_of_speech": "loại từ (noun/verb/adjective/adverb)",
  "vietnamese_meaning": "nghĩa tiếng Việt chính xác",
  "examples_json": {
    "examples": [
      { "band": "4.0", "sentence": "câu ví dụ band 4.0", "translation": "dịch Việt" },
      { "band": "6.0", "sentence": "câu ví dụ band 6.0", "translation": "dịch Việt" },
      { "band": "8.0", "sentence": "câu ví dụ band 8.0 với từ vựng xịn", "translation": "dịch Việt" }
    ]
  }
}`;

    // Chỉ dùng 2 model mới nhất
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let responseData = null;
    let lastError = '';

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await res.json();

        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = data.candidates[0].content.parts[0].text;
          const cleanedJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          responseData = JSON.parse(cleanedJsonText);
          break;
        } else {
          lastError = data.error?.message || `Lỗi HTTP ${res.status}`;
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!responseData) {
      return NextResponse.json(
        { error: `Google AI từ chối: ${lastError}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      source: 'ai_generated',
      data: responseData
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi hệ thống khi tra từ' },
      { status: 500 }
    );
  }
}
