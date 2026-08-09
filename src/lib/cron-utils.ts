// ============================================================================
// CÁC HÀM THUẦN TÚY DÙNG CHUNG CHO CRON JOB
// KHÔNG PHỤ THUỘC VÀO SUPABASE / NEXT / ALIAS — có thể chạy test bằng Node trực tiếp
// ============================================================================

export const DAILY_NOTIFICATION_TIME_DEFAULT = '09:00';
export const DEFAULT_NOTIFY_DAYS: number[] = [1, 7, 30];
export const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const DEFAULT_MESSAGE_TEMPLATE = [
  '🚨 CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN',
  '',
  '📌 Mã HĐ: {contract_code}',
  '🤝 Tên HĐ: {title}',
  '🏢 Đối tác: {partner_name}',
  '📅 Ngày hết hạn: {expiration_date}',
  '⏳ Còn lại: {days_left} ngày',
  '',
  '👉 Vui lòng kiểm tra và xử lý gia hạn!',
].join('\n');

/** Lấy ngày hôm nay dạng "YYYY-MM-DD" theo giờ Việt Nam (GMT+7) */
export function getVietnamToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  return `${map.year}-${map.month}-${map.day}`;
}

/** Lấy giờ hiện tại dạng "HH:MM" (24h) theo giờ Việt Nam */
export function getVietnamHHMM(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  return `${map.hour}:${map.minute}`;
}

/** Parse chuỗi "YYYY-MM-DD" -> timestamp UTC (chỉ lấy phần ngày, giờ = 00:00) */
export function parseUtc(dateStr: string): number {
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return Number.NaN;
  const [y, m, d] = parts;
  if (!y || !m || !d) return Number.NaN;
  return Date.UTC(y, m - 1, d);
}

/**
 * Số ngày còn lại đến ngày hết hạn (tính theo ngày thực, không phụ thuộc TZ):
 * const days_left = Math.round((expDate - today) / (1000*60*60*24))
 */
export function computeDaysLeft(endDateStr: string, todayStr: string): number {
  const endTs = parseUtc(endDateStr);
  const todayTs = parseUtc(todayStr);
  if (Number.isNaN(endTs) || Number.isNaN(todayTs)) return Number.NaN;
  return Math.round((endTs - todayTs) / 86_400_000);
}

/**
 * Parse mốc notify_days cho phép nhận:
 *  - mảng số:  [1, 7, 30]
 *  - chuỗi:    "1,7,30" | "1 7 30" | "[1, 7, 30]"
 * Số hợp lệ phải >= 0. Giá trị trống trả về mảng rỗng.
 */
export function parseNotifyDays(raw: unknown): number[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === 'number' ? v : Number(v)))
      .filter((n) => Number.isFinite(n) && n >= 0);
  }

  const str = String(raw).trim().replace(/^\[|\]$/g, '');
  if (!str) return [];

  return str
    .split(/[,;\s]+/)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

/** Chuẩn hóa "HH:MM" (luôn 2 chữ số giờ/phút), nếu sai định dạng dùng mặc định */
export function normalizeHHMM(value: string): string {
  const m = value.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return DAILY_NOTIFICATION_TIME_DEFAULT;
  return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
}

/** Dựng nội dung tin nhắn từ template, thay các biến {title}, {contract_code}, ... */
export function buildMessage(
  template: string,
  c: {
    title: string;
    contract_code?: string | null;
    party_b?: string | null;
    end_date?: string | null;
  },
  daysLeft: number,
): string {
  return template
    .replace(/\{title\}/g, c.title || '')
    .replace(/\{contract_code\}/g, c.contract_code || '')
    .replace(/\{partner_name\}/g, c.party_b || '')
    .replace(/\{expiration_date\}/g, c.end_date || '')
    .replace(/\{days_left\}/g, String(daysLeft));
}

/** Gọi Telegram Bot API sendMessage. Trả về response JSON đã parse. */
export async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string,
): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // KHÔNG dùng parse_mode để tránh lỗi Markdown với ký tự đặc biệt
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const data: unknown = await res.json().catch(() => ({}));
  return data;
}

/** Kiểm tra response Telegram trả về ok: true hay không */
export function isTelegramOk(data: unknown): boolean {
  if (data && typeof data === 'object' && 'ok' in data) {
    return Boolean((data as { ok?: unknown }).ok);
  }
  return false;
}