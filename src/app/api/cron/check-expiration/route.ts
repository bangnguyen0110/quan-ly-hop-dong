import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRun = searchParams.get('force') === 'true'; // Cho phép chạy ép buộc nếu truyền ?force=true

    // 1. Lấy cấu hình Telegram
    const { data: config } = await supabase.from('telegram_settings').select('*').limit(1).maybeSingle();

    if (!config || !config.is_active || !config.bot_token || !config.chat_id) {
      return NextResponse.json({ message: 'Tắt tính năng thông báo hoặc chưa nhập Token/Chat ID' }, { status: 200 });
    }

    // 2. Kiểm tra giờ Việt Nam hiện tại (UTC+7)
    const nowInVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const currentHour = String(nowInVN.getHours()).padStart(2, '0');
    const currentMinute = String(nowInVN.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;

    const targetTime = config.notify_time || '11:35';

    // Nếu chạy qua Cron tự động (không phải force) và chưa đến giờ setup thì bỏ qua
    if (!forceRun) {
      // So sánh theo khung giờ HH:mm (chấp nhận chênh lệch trong cùng 1 tiếng nếu cron quét hàng giờ)
      const targetHour = targetTime.split(':')[0];
      if (currentHour !== targetHour) {
        return NextResponse.json({ 
          message: `Chưa đến giờ thông báo (Giờ hiện tại VN: ${currentTimeStr}, Giờ cài đặt: ${targetTime})` 
        });
      }
    }

    // 3. Quét danh sách hợp đồng
    const { data: contracts } = await supabase.from('contracts').select('*').eq('status', 'active');
    if (!contracts || contracts.length === 0) {
      return NextResponse.json({ message: 'Không có hợp đồng nào' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifiedContracts = [];
    const template = config.message_template || `🔔 *CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN*\n\n📜 *Tên HĐ:* {ten_hd}\n⏳ *Còn lại:* {ngay_con_lai} ngày`;

    for (const contract of contracts) {
      if (!contract.end_date) continue;

      const endDate = new Date(contract.end_date);
      endDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const notifyDays: number[] = contract.custom_notify_days || [1, 7];

      if (notifyDays.includes(diffDays)) {
        let formattedMessage = template
          .replace(/{ten_hd}/g, contract.title || 'N/A')
          .replace(/{ma_hd}/g, contract.contract_code || 'Không có mã')
          .replace(/{doi_tac}/g, contract.party_b || 'Chưa cập nhật')
          .replace(/{gia_tri}/g, Number(contract.value || 0).toLocaleString('vi-VN'))
          .replace(/{ngay_con_lai}/g, String(diffDays))
          .replace(/{ngay_het_han}/g, contract.end_date)
          .replace(/{link_file}/g, contract.file_url ? `[Tải file tại đây](${contract.file_url})` : 'Không có file');

        await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chat_id,
            text: formattedMessage,
            parse_mode: 'Markdown',
          }),
        });

        notifiedContracts.push(contract.title);
      }
    }

    return NextResponse.json({ success: true, currentTime: currentTimeStr, notified: notifiedContracts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}