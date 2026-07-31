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

    // Tùy chỉnh Prompt theo từng Chế độ
    let modeInstruction = '';
    if (mode === 'ielts') {
      modeInstruction = `
        - Ngữ cảnh: Phục vụ ôn thi IELTS Academic/General.
        - Câu ví dụ phải mang tính học thuật, từ vựng nâng cao (Band 7.0 - 8.5).
        - Thêm thuộc tính "band" vào từng ví dụ (Ví dụ: "IELTS 7.5+").
      `;
    } else if (mode === 'business') {
      modeInstruction = `
        - Ngữ cảnh: Tiếng Anh Công sở, môi trường làm việc doanh nghiệp, đàm phán, email chuyên nghiệp.
        - Câu ví dụ thể hiện các tình huống giao tiếp văn phòng, báo cáo, họp hành.
      `;
    } else {
      modeInstruction = `
        - Ngữ cảnh: Tiếng Anh Giao tiếp đời thường (Daily conversation).
        - Câu ví dụ tự nhiên, gần gũi, hay dùng trong cuộc sống hàng ngày.
      `;
    }

    const systemPrompt = `
      Bạn là một trợ lý giảng dạy tiếng Anh AI xuất sắc. 
      Nhiệm vụ: Phân tích từ vựng "${word}" dựa theo ngữ cảnh yêu cầu.

      Yêu cầu ngữ cảnh:
      ${modeInstruction}

      TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (Không kèm lời dẫn, không bọc trong markdown):
      {
        "word": "${word}",
        "ipa": "/phiên_âm/",
        "partOfSpeech": "Từ loại (Noun / Verb / Adjective...)",
        "vietnamese_meaning": "Nghĩa tiếng Việt chính xác nhất",
        "examples": [
          {
            "en": "Câu ví dụ bằng tiếng Anh 1",
            "vi": "Dịch nghĩa tiếng Việt 1",
            "band": "IELTS 7.5+"
          },
          {
            "en": "Câu ví dụ bằng tiếng Anh 2",
            "vi": "Dịch nghĩa tiếng Việt 2"
          }
        ]
      }
      Lưu ý: Chỉ thêm trường "band" trong object ví dụ nếu mode đang chọn là IELTS. Chuỗi JSON trả về phải hoàn toàn chuẩn mực, không chứa comment (//).
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
