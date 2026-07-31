import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { word } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Từ vựng không được để trống' }, { status: 400 });
    }

    const cleanWord = word.trim().toLowerCase();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Thiếu GEMINI_API_KEY trong cấu hình Vercel' }, { status: 500 });
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

    // Danh sách model REST API chính thức của Google Gemini
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let responseData = null;
    let lastErrorMsg = '';

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
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
          break; // Tìm thấy model chạy thành công, thoát vòng lặp
        } else {
          lastErrorMsg = data.error?.message || `Model ${model} trả về lỗi`;
        }
      } catch (e: any) {
        lastErrorMsg = e.message;
      }
    }

    if (!responseData) {
      throw new Error(lastErrorMsg || 'Không thể kết nối tới Google AI Gemini');
    }

    return NextResponse.json({
      success: true,
      source: 'ai_generated',
      data: responseData
    });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi gọi AI Gemini' },
      { status: 500 }
    );
  }
}
