import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = (body.message || '').toString().trim();

    if (!message) {
      return NextResponse.json(
        { error: 'Thiếu nội dung tin nhắn (message)' },
        { status: 400 }
      );
    }

    // --- 1) Ưu tiên từ request body (người dùng "Kiểm tra kết nối" truyền vào) ---
    let botToken = (body.botToken || '').toString().trim();
    let chatId = (body.chatId || '').toString().trim();

    // --- 2) Fallback: đọc từ bảng system_settings trong DB ---
    if (!botToken || !chatId) {
      try {
        const { data: settings, error } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['telegram_bot_token', 'telegram_chat_id']);

        if (!error && settings) {
          const map: Record<string, string> = {};
          for (const row of settings) {
            map[row.key] = row.value || '';
          }
          if (!botToken) botToken = map.telegram_bot_token || '';
          if (!chatId) chatId = map.telegram_chat_id || '';
        }
      } catch (dbErr) {
        console.error('Lỗi đọc system_settings:', dbErr);
      }
    }

    // --- 3) Fallback cuối: từ biến môi trường ---
    if (!botToken) botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!chatId) chatId = process.env.TELEGRAM_CHAT_ID || '';

    if (!botToken || !chatId) {
      return NextResponse.json(
        {
          error:
            'Chưa có cấu hình Telegram. Hãy vào trang Cấu hình Telegram để nhập Bot Token và Chat ID (hoặc cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID trong .env.local).',
          missing: {
            botToken: botToken ? 'ok' : 'missing',
            chatId: chatId ? 'ok' : 'missing',
          },
        },
        { status: 500 }
      );
    }

    // Gửi trực tiếp tới Telegram Bot API
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok || resData.ok !== true) {
      let errorMessage =
        resData.description || resData.error || 'Telegram API báo lỗi';
      if (res.status === 401) {
        errorMessage =
          'Bot Token không hợp lệ hoặc đã bị thu hồi (HTTP 401). Hãy kiểm tra lại cấu hình Telegram trên trang /telegram.';
      }
      return NextResponse.json(
        { error: errorMessage, detail: resData },
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