import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { word } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Từ vựng không được để trống' }, { status: 400 });
    }

    const cleanWord = word.trim().toLowerCase();
    const apiKey = process.env.GROQ_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GROQ_API_KEY trên Vercel.' },
        { status: 500 }
      );
    }

    const systemPrompt = `Bạn là chuyên gia IELTS. Nhiệm vụ của bạn là phân tích từ tiếng Anh và trả về duy nhất một đối tượng JSON chuẩn xác theo cấu trúc yêu cầu. Không thêm bất kỳ lời dẫn hay mã markdown nào khác.`;

    const userPrompt = `Hãy phân tích từ "${cleanWord}" và trả về JSON theo đúng định dạng sau:
{
  "word": "${cleanWord}",
  "ipa": "/phiên âm/",
  "part_of_speech": "loại từ",
  "vietnamese_meaning": "nghĩa tiếng Việt",
  "examples_json": {
    "examples": [
      { "band": "4.0", "sentence": "câu ví dụ band 4.0", "translation": "dịch Việt" },
      { "band": "6.0", "sentence": "câu ví dụ band 6.0", "translation": "dịch Việt" },
      { "band": "8.0", "sentence": "câu ví dụ band 8.0 nâng cao", "translation": "dịch Việt" }
    ]
  }
}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' } // Ép Groq trả về JSON sạch 100%
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Lỗi Groq API [${res.status}]: ${data.error?.message || 'Không thể tra từ'}` },
        { status: res.status }
      );
    }

    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: 'AI không trả về dữ liệu' }, { status: 500 });
    }

    const parsedData = JSON.parse(rawContent);

    return NextResponse.json({
      success: true,
      source: 'groq_generated',
      data: parsedData
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi hệ thống khi tra từ' },
      { status: 500 }
    );
  }
}
