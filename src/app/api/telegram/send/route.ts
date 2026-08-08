import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Gửi thông báo Telegram qua máy chủ (server-side)
// - Tránh lộ Bot Token ra URL/trình duyệt
// - Lấy Bot Token theo thứ tự ưu tiên: body.botToken (người dùng vừa nhập)
//   -> env TELEGRAM_BOT_TOKEN (khuyến nghị cho production)
//   -> bảng telegram_settings trong Supabase
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const chatId = (body.chatId || '').toString().trim();
    const text = (body.text || '').toString().trim();
    const clientBotToken = (body.botToken || '').toString().trim();

    if (!chatId || !text) {
      return NextResponse.json(
        { error: 'Thiếu chatId hoặc text' },
        { status: 400 }
      );
    }

    // 1) Token từ client (người dùng vừa nhập ở form)
    let botToken = clientBotToken;

    // 2) Fallback: biến môi trường server-side
    if (!botToken) {
      botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    }

    // 3) Fallback cuối: đọc từ bảng telegram_settings trong DB
    if (!botToken) {
      const { data: settings, error: settingsError } = await supabase
        .from('telegram_settings')
        .select('bot_token')
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        // Trả lỗi chi tiết từ Supabase (không che giấu nguyên nhân)
        return NextResponse.json(
          {
            error:
              'Không đọc được cấu hình Telegram từ Database: ' +
              (settingsError.message || settingsError.code || 'lỗi không xác định') +
              '. Hãy đảm bảo biến môi trường Supabase hợp lệ hoặc nhập Bot Token trên trang cấu hình.',
            detail: settingsError,
          },
          { status: 502 }
        );
      }
      botToken = settings?.bot_token || '';
    }

    if (!botToken) {
      return NextResponse.json(
        {
          error:
            'Chưa có Bot Token hợp lệ. Vui lòng vào trang Cấu hình Telegram, nhập Bot Token đúng và nhấn Lưu (hoặc đặt biến môi trường TELEGRAM_BOT_TOKEN).',
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
      // Nếu Telegram trả 401 => token sai; trả message dễ hiểu
      let message =
        resData.description || resData.error || 'Telegram API báo lỗi';
      if (res.status === 401) {
        message =
          'Bot Token không hợp lệ hoặc đã bị thu hồi (HTTP 401). Hãy lấy lại Token từ @BotFather và cập nhật trên trang Cấu hình Telegram.';
      }
      return NextResponse.json(
        { error: message, detail: resData },
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
