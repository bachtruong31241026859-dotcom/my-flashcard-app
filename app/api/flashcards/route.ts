import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// 1. Lấy danh sách từ vựng đã lưu của user
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để xem bộ từ' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. Lưu một từ vựng mới vào bộ thẻ
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để lưu từ vựng' }, { status: 401 });
    }

    const cardData = await req.json();

    const { data, error } = await supabase
      .from('flashcards')
      .insert([
        {
          user_id: user.id,
          word: cardData.word,
          ipa: cardData.ipa,
          part_of_speech: cardData.part_of_speech,
          vietnamese_meaning: cardData.vietnamese_meaning,
          examples_json: cardData.examples_json,
          status: 'learning'
        }
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
