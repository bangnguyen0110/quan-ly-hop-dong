import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Gửi thông báo Telegram qua máy chủ (server-side)
// - Tránh lộ Bot Token ra trình duyệt
// - Đính kèm credential (Bot Token) đúng phía server
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const chatId = (body.chatId || '').toString().trim();
    const text = (body.text || '').toString().trim();

    if (!chatId || !text) {
      return NextResponse.json(
        { error: 'Thiếu chatId hoặc text' },
        { status: 400 }
      );
    }

    // Lấy Bot Token từ cấu hình Telegram đã lưu trong DB (tránh lộ ra client)
    const { data: settings, error: settingsError } = await supabase
      .from('telegram_settings')
      .select('bot_token')
      .limit(1)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const botToken = settings?.bot_token || '';

    if (!botToken) {
      return NextResponse.json(
        {
          error:
            'Chưa có Bot Token hợp lệ. Vui lòng vào trang Cấu hình Telegram, nhập Bot Token đúng và nhấn Lưu.',
        },
        { status: 400 }
      );
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok || resData.ok !== true) {
      const description =
        resData.description || resData.error || 'Telegram API báo lỗi';
      return NextResponse.json(
        { error: description, detail: resData },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi Telegram';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
