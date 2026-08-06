import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Lấy cấu hình Telegram
    const { data: config } = await supabase.from('telegram_settings').select('*').single();
    if (!config || !config.is_active || !config.bot_token || !config.chat_id) {
      return NextResponse.json({ message: 'Chưa cấu hình Telegram Bot' }, { status: 400 });
    }

    // 2. Lấy các hợp đồng đang hoạt động
    const { data: contracts } = await supabase.from('contracts').select('*').eq('status', 'active');
    if (!contracts) return NextResponse.json({ message: 'Không có hợp đồng' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifiedContracts = [];

    for (const contract of contracts) {
      const endDate = new Date(contract.end_date);
      endDate.setHours(0, 0, 0, 0);

      // Tính khoảng cách số ngày còn lại
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Kiểm tra xem số ngày còn lại có nằm trong mốc cảnh báo (custom_notify_days)
      const notifyDays: number[] = contract.custom_notify_days || [1, 7];
      
      if (notifyDays.includes(diffDays)) {
        // Gửi thông báo Telegram
        const message = `
🔔 **CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN**
----------------------------------
📜 **Tên HĐ:** ${contract.title}
🏷️ **Mã HĐ:** ${contract.contract_code || 'Chưa có'}
🤝 **Đối tác:** ${contract.party_b || 'N/A'}
⏳ **Còn lại:** **${diffDays} ngày** (Hết hạn ngày: ${contract.end_date})
💰 **Giá trị:** ${Number(contract.value).toLocaleString('vi-VN')} VNĐ
${contract.file_url ? `📎 [Xem file đính kèm](${contract.file_url})` : ''}
        `;

        await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chat_id,
            text: message,
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