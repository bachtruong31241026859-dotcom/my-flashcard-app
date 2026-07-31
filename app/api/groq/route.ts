import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { word } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Từ vựng không được để trống' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an IELTS expert dictionary API. Respond ONLY with raw JSON format (no markdown code blocks, no backticks, no extra text).
The output must strictly follow this JSON schema:
{
  "word": "string",
  "ipa": "string",
  "partOfSpeech": "string",
  "vietnamese_meaning": "string",
  "examples": [
    {
      "en": "string",
      "vi": "string",
      "band": "4.0 | 6.0 | 8.0"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Analyze the word: "${word}"`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return NextResponse.json({ data: parsed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi kết nối AI' }, { status: 500 });
  }
}
