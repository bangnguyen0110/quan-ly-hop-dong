import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Ép Next.js chạy API này ở dạng Dynamic (chỉ thực thi khi có Request gửi đến, không build tĩnh)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: config } = await supabase.from('telegram_settings').select('*').single();
    if (!config || !config.is_active || !config.bot_token || !config.chat_id) {
      return NextResponse.json({ message: 'Chưa cấu hình Telegram Bot' }, { status: 400 });
    }

    const { data: contracts } = await supabase.from('contracts').select('*').eq('status', 'active');
    if (!contracts) return NextResponse.json({ message: 'Không có hợp đồng' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notified = [];

    for (const contract of contracts) {
      const endDate = new Date(contract.end_date);
      endDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const notifyDays: number[] = contract.custom_notify_days || [1, 7];

      if (notifyDays.includes(diffDays)) {
        const message = `🔔 *CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN*\n\n📜 *Tên HĐ:* ${contract.title}\n🏷️ *Mã HĐ:* ${contract.contract_code || 'N/A'}\n⏳ *Còn lại:* ${diffDays} ngày (Hạn: ${contract.end_date})\n${contract.file_url ? `📎 [Xem File](${contract.file_url})` : ''}`;

        await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chat_id,
            text: message,
            parse_mode: 'Markdown',
          }),
        });
        notified.push(contract.title);
      }
    }

    return NextResponse.json({ success: true, notified });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}