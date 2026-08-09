// Test thuật toán quét hợp đồng của CRON (chỉ logic thuần túy, không cần Supabase/Next).
// Chạy: node scripts/cron-logic.test.mjs
import assert from 'node:assert/strict';
import {
  DEFAULT_NOTIFY_DAYS,
  buildMessage,
  computeDaysLeft,
  getVietnamToday,
  normalizeHHMM,
  parseNotifyDays,
} from '../src/lib/cron-utils.ts';

// ---------- 1) parseNotifyDays: parse mốc ngày từ nhiều định dạng ----------
assert.deepEqual(parseNotifyDays('1,7,30'), [1, 7, 30]);
assert.deepEqual(parseNotifyDays('[1, 7, 30]'), [1, 7, 30]);
assert.deepEqual(parseNotifyDays([1, 7, 30]), [1, 7, 30]);
assert.deepEqual(parseNotifyDays('1 7 30'), [1, 7, 30]);
assert.deepEqual(parseNotifyDays('1;7;30'), [1, 7, 30]);
assert.deepEqual(parseNotifyDays(''), []);
assert.deepEqual(parseNotifyDays(null), []);
assert.deepEqual(parseNotifyDays(undefined), []);
assert.deepEqual(parseNotifyDays('abc'), []);
assert.deepEqual(parseNotifyDays('1,7,abc,30'), [1, 7, 30]);

// ---------- 2) computeDaysLeft: tính chính xác số ngày còn lại ----------
assert.equal(computeDaysLeft('2026-08-10', '2026-08-10'), 0, 'Hết hạn hôm nay');
assert.equal(computeDaysLeft('2026-09-09', '2026-08-10'), 30, 'Còn đúng 30 ngày');
assert.equal(computeDaysLeft('2026-08-17', '2026-08-10'), 7, 'Còn đúng 7 ngày');
assert.equal(computeDaysLeft('2026-08-11', '2026-08-10'), 1, 'Còn đúng 1 ngày');
assert.equal(computeDaysLeft('2026-08-25', '2026-08-10'), 15, 'Còn 15 ngày (không thuộc mốc [1,7,30])');
assert.equal(computeDaysLeft('2026-08-09', '2026-08-10'), -1, 'Đã hết hạn 1 ngày');
assert.equal(computeDaysLeft('2026-09-09T00:00:00.000Z', '2026-08-10'), 30, 'Hỗ trợ input datetime ISO');

// ---------- 3) normalizeHHMM: chuẩn hóa khung giờ thông báo ----------
assert.equal(normalizeHHMM('09:00'), '09:00');
assert.equal(normalizeHHMM('9:00'), '09:00');
assert.equal(normalizeHHMM('11:35'), '11:35');
assert.equal(normalizeHHMM(''), '09:00');
assert.equal(normalizeHHMM('abc'), '09:00');

// ---------- 4) getVietnamToday: định dạng YYYY-MM-DD ----------
assert.match(getVietnamToday(), /^\d{4}-\d{2}-\d{2}$/, 'Ngày VN phải dạng YYYY-MM-DD');

// ---------- 5) Thuật toán lọc theo mốc notify_days (cùng logic như route GET) ----------
function decide(contract, todayStr) {
  const daysLeft = computeDaysLeft(contract.end_date, todayStr);
  if (Number.isNaN(daysLeft)) return 'skip';
  if (daysLeft < 0) return 'skip'; // đã hết hạn
  const parsed = parseNotifyDays(contract.notify_days ?? contract.custom_notify_days);
  const notifyDays = parsed.length > 0 ? parsed : DEFAULT_NOTIFY_DAYS;
  return notifyDays.includes(daysLeft) ? 'send' : 'skip'; // ĐIỀU KIỆN GỬI
}

const TODAY = '2026-08-10';
const contracts = [
  { code: 'HD01', end_date: '2026-09-09', notify_days: [1, 7, 30] }, // 30 -> GỬI
  { code: 'HD02', end_date: '2026-08-17', notify_days: [1, 7, 30] }, // 7 -> GỬI
  { code: 'HD03', end_date: '2026-08-11', notify_days: '1,7,30' }, // 1 -> GỬI (chuỗi)
  { code: 'HD04', end_date: '2026-08-25', notify_days: [1, 7, 30] }, // 15 -> BỎ QUA
  { code: 'HD05', end_date: '2026-08-08', notify_days: [1, 7, 30] }, // -2 -> BỎ QUA (đã hết hạn)
  { code: 'HD06', end_date: '2026-08-25', notify_days: [5, 15] }, // 15 -> GỬI (mốc tùy chỉnh 15)
  { code: 'HD07', end_date: '2026-08-28', notify_days: null, custom_notify_days: [1, 7] }, // 18 -> BỎ QUA
  { code: 'HD08', end_date: '2026-08-17', notify_days: undefined, custom_notify_days: [7] }, // 7 -> GỬI (fallback cột cũ)
];

const sent = contracts
  .filter((c) => decide(c, TODAY) === 'send')
  .map((c) => c.code)
  .sort();
const skipped = contracts.length - sent.length;

assert.deepEqual(sent, ['HD01', 'HD02', 'HD03', 'HD06', 'HD08'].sort(), 'Sai danh sách HĐ được gửi');
assert.equal(skipped, 3, 'Sai số HĐ bị bỏ qua');

// ---------- 6) buildMessage: thay thế biến trong template ----------
const msg = buildMessage(
  'HĐ {contract_code} - {partner_name} hết hạn {expiration_date}, còn {days_left} ngày',
  { title: 'Hợp đồng CNTT', contract_code: 'HD01', party_b: 'Công ty ABC', end_date: '2026-09-09' },
  30,
);
assert.ok(msg.includes('HD01'), 'Template phải chèn mã HĐ');
assert.ok(msg.includes('Công ty ABC'), 'Template phải chèn đối tác');
assert.ok(msg.includes('30 ngày'), 'Template phải chèn số ngày còn lại');

console.log('✅ TẤT CẢ TESTCASE CRON PASSED');
console.log('   - HĐ được gửi:', sent.join(', '));
console.log('   - Số HĐ bỏ qua:', skipped);