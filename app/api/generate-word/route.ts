import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { word } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Từ vựng không được để trống' }, { status: 400 });
    }

    const cleanWord = word.trim().toLowerCase();

    // Danh sách các model Gemini hỗ trợ (tự động chuyển nếu model đầu bị lỗi)
    const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
    let responseText = '';
    let lastError: any = null;

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

    // Thử lần lượt các model cho đến khi thành công
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        responseText = await result.response.text();
        if (responseText) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('Không thể kết nối đến máy chủ AI Gemini');
    }

    // Làm sạch chuỗi JSON nếu AI vô tình trả về thêm ngoặc markdown
    const cleanedJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedJsonText);

    return NextResponse.json({
      success: true,
      source: 'ai_generated',
      data: parsedData
    });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi gọi AI Gemini' },
      { status: 500 }
    );
  }
}
