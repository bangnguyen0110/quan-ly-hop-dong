import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // 1. Auth check dành cho Cron Job: không dùng User Session/Cookie ở đây.
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET chưa được cấu hình trong .env; cho phép truy cập không kiểm tra header.');
  } else if (!authHeader) {
    console.warn('[Cron] Thiếu header Authorization khi CRON_SECRET đã được cấu hình.');
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Sai token Authorization so với CRON_SECRET.');
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    // 2. Logic quét hợp đồng trong Database và gửi Telegram
    // ... (Code quét hợp đồng & gửi Telegram)

    return NextResponse.json({ success: true, message: 'Đã hoàn thành quét hợp đồng tự động' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi quét hợp đồng tự động';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}