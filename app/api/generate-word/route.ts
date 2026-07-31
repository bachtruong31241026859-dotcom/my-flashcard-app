import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { word, user_id } = await req.json();
    if (!word || !user_id) {
      return NextResponse.json({ error: 'Thiếu thông tin từ vựng hoặc người dùng' }, { status: 400 });
    }

    const normalizedWord = word.trim().toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user_id).maybeSingle();
    const userRole = profile?.role || 'free';

    const { data: existingWord } = await supabase.from('global_words').select('*').eq('word', normalizedWord).maybeSingle();
    if (existingWord) {
      await linkWordToUser(user_id, existingWord.id);
      return NextResponse.json({ source: 'cache_hit', data: existingWord, message: 'Lấy từ Kho chung (Miễn phí API)' });
    }

    if (userRole === 'free') {
      const { data: limitData } = await supabase.from('daily_word_limits').select('words_created_count').eq('user_id', user_id).eq('date', today).maybeSingle();
      if ((limitData?.words_created_count || 0) >= 3) {
        return NextResponse.json({ error: 'Bạn đã dùng hết 3 lượt tạo từ miễn phí hôm nay. Hãy nâng cấp VIP!' }, { status: 403 });
      }
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
      You are an expert IELTS examiner. Analyze English word "${normalizedWord}".
      Return raw JSON matching this schema:
      {
        "word": "${normalizedWord}",
        "ipa": "string",
        "part_of_speech": "string",
        "vietnamese_meaning": "string",
        "word_family": [{"pos":"string","word":"string","meaning":"string"}],
        "collocations": [{"phrase":"string","meaning":"string"}],
        "common_errors": "string",
        "ielts_application_tip": "string",
        "examples": [
          {"band": "4.0", "sentence": "string", "translation": "string"},
          {"band": "6.0", "sentence": "string", "translation": "string"},
          {"band": "8.0", "sentence": "string", "translation": "string"}
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const aiData = JSON.parse(result.response.text());

    const { data: newGlobalWord, error: insertError } = await supabase.from('global_words').insert({
      word: normalizedWord,
      ipa: aiData.ipa,
      part_of_speech: aiData.part_of_speech,
      vietnamese_meaning: aiData.vietnamese_meaning,
      examples_json: {
        word_family: aiData.word_family,
        collocations: aiData.collocations,
        common_errors: aiData.common_errors,
        ielts_application_tip: aiData.ielts_application_tip,
        examples: aiData.examples
      }
    }).select().single();

    if (insertError) throw insertError;

    await linkWordToUser(user_id, newGlobalWord.id);

    if (userRole === 'free') {
      const { data: limitData } = await supabase.from('daily_word_limits').select('words_created_count').eq('user_id', user_id).eq('date', today).maybeSingle();
      await supabase.from('daily_word_limits').upsert({
        user_id, date: today, words_created_count: (limitData?.words_created_count || 0) + 1
      }, { onConflict: 'user_id,date' });
    }

    return NextResponse.json({ source: 'gemini_api', data: newGlobalWord, message: 'Phân tích AI thành công!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xử lý API' }, { status: 500 });
  }
}

async function linkWordToUser(userId: string, wordId: string) {
  await supabase.from('user_flashcards').upsert({ user_id: userId, word_id: wordId }, { onConflict: 'user_id,word_id' });
}
