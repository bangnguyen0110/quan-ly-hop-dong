import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  DAILY_NOTIFICATION_TIME_DEFAULT,
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_NOTIFY_DAYS,
  buildMessage,
  computeDaysLeft,
  getVietnamHHMM,
  getVietnamToday,
  isTelegramOk,
  normalizeHHMM,
  parseNotifyDays,
  sendTelegram,
} from '@/lib/cron-utils';

type NotifiedContract = {
  code: string;
  days_left: number;
  notify_days: number[];
  status: 'sent' | 'failed';
  telegram: unknown;
};

type SkippedContract = {
  code: string;
  days_left: number;
  notify_days: number[];
  reason: string;
};

// ============================================================================
// ROUTE HANDLER
// ============================================================================
export async function GET(request: Request) {
  const url = new URL(request.url);
  // force=true (dùng cho nút "Chạy thử Cron"): bỏ qua khung giờ & khóa 1 lần/ngày
  const force = url.searchParams.get('force') === 'true';

  const todayStr = getVietnamToday();
  const currentHHMM = getVietnamHHMM();

  try {
    // ---------- 1) Đọc danh sách hợp đồng ----------
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .order('end_date', { ascending: true });

    if (contractsError) {
      console.error('[CRON] Lỗi đọc contracts:', contractsError);
      return NextResponse.json(
        { success: false, error: 'Lỗi đọc danh sách hợp đồng', detail: contractsError },
        { status: 500 },
      );
    }

    const totalContracts = (contracts || []).length;
    console.log('[CRON] Tổng HĐ trong DB:', totalContracts);
    console.log('[CRON] Ngày (GMT+7):', todayStr, '- Giờ:', currentHHMM, '- force:', force);

    // ---------- 2) Đọc cấu hình Telegram & khung giờ từ system_settings ----------
    const SETTING_KEYS = [
      'telegram_bot_token',
      'telegram_chat_id',
      'daily_notification_time',
      'last_cron_run_date',
      'telegram_message_template',
    ];

    const { data: rawSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', SETTING_KEYS);

    if (settingsError) {
      console.error('[CRON] Lỗi đọc system_settings:', settingsError);
    }

    const configMap: Record<string, string> = {};
    for (const row of rawSettings ?? []) {
      configMap[row.key] = (row.value || '').toString().trim();
    }

    let botToken = configMap.telegram_bot_token || '';
    let chatId = configMap.telegram_chat_id || '';
    const notifyTime = normalizeHHMM(configMap.daily_notification_time || DAILY_NOTIFICATION_TIME_DEFAULT);
    const lastCronRunDate = (configMap.last_cron_run_date || '').trim();
    const templateRaw = configMap.telegram_message_template || '';
    const messageTemplate = templateRaw.length > 0 ? templateRaw : DEFAULT_MESSAGE_TEMPLATE;

    // Fallback bảng telegram_settings (nếu thiếu system_settings)
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

    console.log(
      '[CRON] Token:', botToken ? 'Đã có' : 'RỖNG',
      'ChatID:', chatId ? 'Đã có' : 'RỖNG',
      'NotifyTime:', notifyTime,
      'LastRun:', lastCronRunDate || '(chưa từng chạy)',
    );

    // ---------- 3) Cổng điều kiện: khung giờ + 1 lần/ngày (bỏ qua khi force) ----------
    if (!force) {
      if (currentHHMM < notifyTime) {
        console.log(`[CRON] Chưa tới giờ thông báo (hiện ${currentHHMM} < cài ${notifyTime}) — bỏ qua`);
        return NextResponse.json({
          success: false,
          message: `Chưa tới giờ thông báo (hiện ${currentHHMM}, cài đặt ${notifyTime})`,
          date: todayStr,
          time: currentHHMM,
          total_contracts: totalContracts,
          notified_contracts: [],
          skipped_contracts_count: 0,
          reason: 'OUTSIDE_NOTIFICATION_WINDOW',
        });
      }

      if (lastCronRunDate === todayStr) {
        console.log(`[CRON] Đã chạy hôm nay (${todayStr}) — bỏ qua để tránh gửi trùng`);
        return NextResponse.json({
          success: false,
          message: `Đã chạy cron trong ngày ${todayStr}, bỏ qua để tránh gửi trùng`,
          date: todayStr,
          time: currentHHMM,
          total_contracts: totalContracts,
          notified_contracts: [],
          skipped_contracts_count: 0,
          reason: 'ALREADY_RUN_TODAY',
        });
      }
    }

    if (!botToken || !chatId) {
      return NextResponse.json({
        success: false,
        message: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID (vào trang /telegram để nhập)',
        missing: { botToken: botToken ? 'ok' : 'missing', chatId: chatId ? 'ok' : 'missing' },
        date: todayStr,
      });
    }

    // ---------- 4) Lọc chính xác theo mốc notify_days của TỪNG hợp đồng ----------
    const notifiedContracts: NotifiedContract[] = [];
    const skippedContracts: SkippedContract[] = [];

    for (const c of contracts ?? []) {
      const code = c.contract_code || c.id;
      const endDateStr = c.end_date || '';
      const daysLeftVal = computeDaysLeft(endDateStr, todayStr);

      if (Number.isNaN(daysLeftVal)) {
        skippedContracts.push({ code, days_left: NaN, notify_days: [], reason: 'NGÀY HẾT HẠN KHÔNG HỢP LỆ' });
        continue;
      }

      // Mốc: ưu tiên notify_days (cột mới), fallback custom_notify_days (cột cũ), cuối cùng [1,7,30]
      const rawDays = c.notify_days ?? c.custom_notify_days;
      const parsedDays = parseNotifyDays(rawDays);
      const notifyDays = parsedDays.length > 0 ? parsedDays : DEFAULT_NOTIFY_DAYS;

      if (daysLeftVal < 0) {
        skippedContracts.push({ code, days_left: daysLeftVal, notify_days: notifyDays, reason: 'ĐÃ HẾT HẠN' });
        continue;
      }

      // ĐIỀU KIỆN GỬI: chỉ khi days_left nằm ĐÚNG trong mốc cài đặt (ví dụ 30 / 7 / 1)
      if (!notifyDays.includes(daysLeftVal)) {
        skippedContracts.push({
          code,
          days_left: daysLeftVal,
          notify_days: notifyDays,
          reason: `Không nằm trong mốc báo trước [${notifyDays.join(', ')}]`,
        });
        continue;
      }

      // --- Gửi tin nhắn Telegram ---
      const message = buildMessage(messageTemplate, c, daysLeftVal);
      const tgData = await sendTelegram(botToken, chatId, message);
      const tgOk = isTelegramOk(tgData);

      console.log(
        `[CRON] Gửi HĐ "${code}" days_left=${daysLeftVal} mốc=[${notifyDays.join(',')}] →`,
        tgData,
      );

      notifiedContracts.push({
        code,
        days_left: daysLeftVal,
        notify_days: notifyDays,
        status: tgOk ? 'sent' : 'failed',
        telegram: tgData,
      });
    }

    // ---------- 5) Khi test thủ công (force) không có HĐ nào khớp: gửi 1 tin xác nhận luồng ----------
    let noOpNotice: unknown = null;
    if (force && notifiedContracts.length === 0) {
      const noticeText = [
        '✅ Cron job chạy thành công (kiểm tra thủ công).',
        '',
        `Thời gian: ${currentHHMM} ${todayStr} (GMT+7)`,
        `Tổng HĐ: ${totalContracts}`,
        'Không có hợp đồng nào cần thông báo ở mốc đã cài đặt hôm nay.',
      ].join('\n');

      noOpNotice = await sendTelegram(botToken, chatId, noticeText);
      console.log('[CRON] Tin xác nhận test (no-op):', noOpNotice);
    }

    // ---------- 6) Khóa luồng cron: cập nhật last_cron_run_date (chỉ cron thật, không phải test) ----------
    if (!force) {
      const { error: lockErr } = await supabase
        .from('system_settings')
        .upsert(
          { key: 'last_cron_run_date', value: todayStr, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );

      if (lockErr) {
        console.warn('[CRON] Lỗi cập nhật last_cron_run_date:', lockErr);
      } else {
        console.log('[CRON] Đã khóa last_cron_run_date =', todayStr);
      }
    }

    console.log(
      `[CRON] Kết thúc: gửi ${notifiedContracts.length}/${totalContracts}, bỏ qua ${skippedContracts.length}`,
    );

    // ---------- 7) Response chi tiết ----------
    return NextResponse.json({
      success: notifiedContracts.every((n) => n.status === 'sent'),
      message:
        notifiedContracts.length > 0
          ? `Đã gửi thông báo cho ${notifiedContracts.length} hợp đồng (đúng mốc báo trước)`
          : 'Không có hợp đồng nào cần thông báo ở mốc đã cài đặt',
      date: todayStr,
      time: currentHHMM,
      forced: force,
      total_contracts: totalContracts,
      notified_contracts: notifiedContracts,
      skipped_contracts_count: skippedContracts.length,
      skipped_contracts: skippedContracts,
      no_op_notice: noOpNotice,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi quét hợp đồng tự động';
    console.error('[CRON] Lỗi:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}