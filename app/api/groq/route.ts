import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { word, mode } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Chưa nhập từ vựng!' }, { status: 400 });
    }

    // Tùy chỉnh Phân cấp độ theo từng Chế độ
    let modeInstruction = '';
    if (mode === 'ielts') {
      modeInstruction = `
        - Ngữ cảnh: Phục vụ ôn thi IELTS Academic/General.
        - Tạo đúng 3 câu ví dụ phân theo 3 cấp độ IELTS tăng dần:
          1. level: "Band 6.0 - 6.5"
          2. level: "Band 7.0 - 7.5"
          3. level: "Band 8.0 - 9.0"
      `;
    } else if (mode === 'business') {
      modeInstruction = `
        - Ngữ cảnh: Tiếng Anh Công sở, môi trường doanh nghiệp.
        - Tạo đúng 3 câu ví dụ phân theo 3 cấp độ công việc:
          1. level: "Sơ cấp Công sở"
          2. level: "Chuyên nghiệp"
          3. level: "Quản lý / Đàm phán"
      `;
    } else {
      modeInstruction = `
        - Ngữ cảnh: Tiếng Anh Giao tiếp đời thường (Daily Conversation).
        - Tạo đúng 3 câu ví dụ phân theo 3 mức độ giao tiếp:
          1. level: "Giao tiếp cơ bản"
          2. level: "Tự nhiên / Đời sống"
          3. level: "Thành ngữ / Slang"
      `;
    }

    const systemPrompt = `
      Bạn là một trợ lý giảng dạy tiếng Anh AI xuất sắc. 
      Nhiệm vụ: Phân tích từ vựng "${word}" dựa theo ngữ cảnh yêu cầu.

      Yêu cầu ngữ cảnh:
      ${modeInstruction}

      TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (Không kèm lời dẫn, không bọc markdown ```json):
      {
        "word": "${word}",
        "ipa": "/phiên_âm/",
        "partOfSpeech": "Từ loại (Noun / Verb / Adjective...)",
        "vietnamese_meaning": "Nghĩa tiếng Việt chính xác nhất",
        "examples": [
          {
            "level": "Tên cấp độ (VD: Sơ cấp Công sở / Band 7.0 - 7.5...)",
            "en": "Câu ví dụ tiếng Anh",
            "vi": "Dịch nghĩa tiếng Việt"
          }
        ]
      }
      Lưu ý: Đảm bảo chuỗi JSON hoàn toàn hợp lệ, không chứa comment (//).
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: systemPrompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsedData = JSON.parse(content);

    return NextResponse.json({ data: parsedData });
  } catch (error: any) {
    console.error('Groq API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi gọi Groq API' },
      { status: 500 }
    );
  }
}
