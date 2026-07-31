import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    // 1. Kiểm tra API Key đã được cấu hình trong .env.local chưa
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GROQ_API_KEY trong file .env.local' },
        { status: 500 }
      );
    }

    // 2. Lấy dữ liệu từ Request
    const { word } = await req.json();

    if (!word || typeof word !== 'string' || !word.trim()) {
      return NextResponse.json(
        { error: 'Từ vựng không được để trống' },
        { status: 400 }
      );
    }

    // 3. Gọi AI Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert IELTS dictionary API. Analyze the given English word and output ONLY a valid JSON object matching this structure:
{
  "word": "string (the word formatted correctly)",
  "ipa": "string (IPA pronunciation, e.g. /.../)",
  "partOfSpeech": "string (e.g. Noun, Verb, Adjective, Adverb)",
  "vietnamese_meaning": "string (natural Vietnamese translation)",
  "examples": [
    {
      "en": "string (example sentence in academic/IELTS context)",
      "vi": "string (Vietnamese translation)",
      "band": "string (e.g. '6.5' or '8.0')"
    }
  ]
}
Provide 2 to 3 high-quality examples using the word in realistic IELTS Writing or Speaking contexts. Respond strictly with JSON.`,
        },
        {
          role: 'user',
          content: `Analyze the word: "${word.trim()}"`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.2, // Giúp kết quả chính xác và nhất quán
    });

    const content = completion.choices[0]?.message?.content || '{}';

    // 4. Parse JSON từ kết quả của Groq
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      return NextResponse.json(
        { error: 'Lỗi định dạng dữ liệu trả về từ AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: parsed });
  } catch (err: any) {
    console.error('Groq API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Lỗi kết nối AI Groq' },
      { status: 500 }
    );
  }
}
