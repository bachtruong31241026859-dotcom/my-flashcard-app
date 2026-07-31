import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { word } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Từ vựng không được để trống' }, { status: 400 });
    }

    const cleanWord = word.trim().toLowerCase();
    let apiKey = process.env.GEMINI_API_KEY || '';

    // Tự động làm sạch Key (xóa khoảng trắng hoặc dấu ngoặc kép nếu lỡ dán thừa)
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
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

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastErrorDetails = '';

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey // Gửi Key qua Header an toàn
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await res.json();

        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = data.candidates[0].content.parts[0].text;
          const cleanedJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const responseData = JSON.parse(cleanedJsonText);
          
          return NextResponse.json({
            success: true,
            source: 'ai_generated',
            data: responseData
          });
        } else {
          lastErrorDetails = `[${model} - Code ${res.status}]: ${data.error?.message || JSON.stringify(data)}`;
        }
      } catch (e: any) {
        lastErrorDetails = `[${model} Exception]: ${e.message}`;
      }
    }

    return NextResponse.json(
      { error: `Google AI từ chối: ${lastErrorDetails}` },
      { status: 500 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi hệ thống khi tra từ' },
      { status: 500 }
    );
  }
}
