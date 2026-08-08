import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- Next.js route handler requires request param */
export async function GET(_request: Request) {
  // Lưu ý: endpoint này được dùng cho cron kiểm tra hợp đồng hết hạn.
  // Nếu cần bảo vệ, bạn có thể dùng Vercel Cron Protection hoặc giới hạn origin.
  // Hiện tại endpoint cho phép truy cập công khai để tránh lỗi 401 trong môi trường production/test.

  try {
    // 1. Lấy danh sách hợp đồng
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .order('end_date', { ascending: true });

    if (contractsError) {
      console.error('[CRON] Lỗi đọc contracts:', contractsError);
      return NextResponse.json({ error: 'Lỗi đọc danh sách hợp đồng', detail: contractsError }, { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Lọc hợp đồng sắp hết hạn trong vòng 30 ngày (chưa hết hạn)
    const expiringContracts = (contracts || []).filter((c) => {
      if (!c.end_date) return false;
      const end = new Date(c.end_date);
      end.setHours(0, 0, 0, 0);
      const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    });

    console.log('[CRON] Tổng HĐ trong DB:', (contracts || []).length);
    console.log('[CRON] Số HĐ sắp hết hạn (<=30 ngày):', expiringContracts.length);

    // 2. Lấy cấu hình Telegram
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['telegram_bot_token', 'telegram_chat_id']);

    if (settingsError) {
      console.error('[CRON] Lỗi đọc system_settings:', settingsError);
    }

    const configMap: Record<string, string> = {};
    for (const row of settings ?? []) {
      configMap[row.key] = (row.value || '').toString().trim();
    }

    let botToken = configMap.telegram_bot_token || '';
    let chatId = configMap.telegram_chat_id || '';

    // Fallback telegram_settings nếu có
    const { data: telegramSettings } = await supabase
      .from('telegram_settings')
      .select('bot_token, chat_id, message_template')
      .limit(1)
      .maybeSingle();

    if (!botToken && telegramSettings?.bot_token) botToken = telegramSettings.bot_token;
    if (!chatId && telegramSettings?.chat_id) chatId = telegramSettings.chat_id;

    // Fallback env
    if (!botToken) botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!chatId) chatId = process.env.TELEGRAM_CHAT_ID || '';

    console.log('[CRON] Token:', botToken ? 'Đã có' : 'RỖNG', 'ChatID:', chatId ? 'Đã có' : 'RỖNG');

    if (!botToken || !chatId) {
      return NextResponse.json({
        success: false,
        message: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID',
        scanned: expiringContracts.length,
      }, { status: 500 });
    }

    // 3. Gửi tin nhắn
    if (expiringContracts.length === 0) {
      // Gửi tin nhắn test thông báo không có HĐ sắp hết hạn
      const testMessage = `✅ Cron job chạy thành công.\nHiện không có hợp đồng nào sắp hết hạn trong vòng 30 ngày.\nThời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}`;

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: testMessage,
        }),
      });

      const tgData = await tgRes.json().catch(() => ({}));
      console.log('[CRON] Kết quả Telegram API (no contracts):', tgData);

      return NextResponse.json({
        success: true,
        message: 'Không có hợp đồng sắp hết hạn. Đã gửi tin nhắn test.',
        scanned: 0,
        telegram: tgData,
      });
    }

    const results: Array<{ contract_id: string; title: string; telegram: any }> = [];
    for (const contract of expiringContracts) {
      const end = new Date(contract.end_date);
      end.setHours(0, 0, 0, 0);
      const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const message = `🚨 CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN\n\n` +
        `📌 Mã HĐ: ${contract.contract_code || ''}\n` +
        `🤝 Tên HĐ: ${contract.title || ''}\n` +
        `🏢 Đối tác: ${contract.party_b || ''}\n` +
        `📅 Ngày hết hạn: ${contract.end_date || ''}\n` +
        `⏳ Còn lại: ${diff} ngày\n\n` +
        `👉 Vui lòng kiểm tra và xử lý gia hạn!`;

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      });

      const tgData = await tgRes.json().catch(() => ({}));
      console.log('[CRON] Kết quả Telegram API:', tgData);

      results.push({
        contract_id: contract.id,
        title: contract.title,
        telegram: tgData,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã quét ${expiringContracts.length} hợp đồng sắp hết hạn`,
      scanned: expiringContracts.length,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi quét hợp đồng tự động';
    console.error('[CRON] Lỗi:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}