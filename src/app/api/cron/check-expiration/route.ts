import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Lấy cấu hình Telegram
    const { data: config } = await supabase.from('telegram_settings').select('*').limit(1).maybeSingle();

    if (!config || !config.is_active || !config.bot_token || !config.chat_id) {
      return NextResponse.json({ message: 'Tắt tính năng thông báo hoặc chưa nhập Token/Chat ID' }, { status: 200 });
    }

    // 2. Lấy danh sách hợp đồng đang hoạt động
    const { data: contracts } = await supabase.from('contracts').select('*').eq('status', 'active');
    if (!contracts || contracts.length === 0) {
      return NextResponse.json({ message: 'Không có hợp đồng nào' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifiedContracts = [];

    // Mẫu thông báo mặc định nếu chưa cài đặt
    const template = config.message_template || `🔔 *CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN*

📜 *Tên HĐ:* {ten_hd}
🏷️ *Mã HĐ:* {ma_hd}
⏳ *Còn lại:* {ngay_con_lai} ngày (Hạn: {ngay_het_han})`;

    for (const contract of contracts) {
      if (!contract.end_date) continue;

      const endDate = new Date(contract.end_date);
      endDate.setHours(0, 0, 0, 0);

      // Tính số ngày còn lại
      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const notifyDays: number[] = contract.custom_notify_days || [1, 7];

      // Nếu số ngày còn lại trùng khớp với mốc cài đặt (ví dụ: đúng còn 1 ngày hoặc đúng còn 7 ngày)
      if (notifyDays.includes(diffDays)) {
        // Thay thế các từ khóa biến trong template
        let formattedMessage = template
          .replace(/{ten_hd}/g, contract.title || 'N/A')
          .replace(/{ma_hd}/g, contract.contract_code || 'Không có mã')
          .replace(/{doi_tac}/g, contract.party_b || 'Chưa cập nhật')
          .replace(/{gia_tri}/g, Number(contract.value || 0).toLocaleString('vi-VN'))
          .replace(/{ngay_con_lai}/g, String(diffDays))
          .replace(/{ngay_het_han}/g, contract.end_date)
          .replace(/{link_file}/g, contract.file_url ? `[Tải file tại đây](${contract.file_url})` : 'Không có file');

        // Gửi thông báo đến Telegram
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

    return NextResponse.json({ success: true, notified: notifiedContracts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}