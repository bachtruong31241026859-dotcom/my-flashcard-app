import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1. API Lưu từ vựng mới vào Supabase
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { word, ipa, part_of_speech, partOfSpeech, vietnamese_meaning, examples_json } = body;

    if (!word) {
      return NextResponse.json({ error: 'Từ vựng không được để trống' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('flashcards')
      .insert([
        {
          word,
          ipa,
          part_of_speech: part_of_speech || partOfSpeech,
          vietnamese_meaning,
          examples_json,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// 2. API Lấy danh sách từ vựng đã lưu
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
