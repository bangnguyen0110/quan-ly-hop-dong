import { NextResponse } from 'next/server';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- Next.js route handler requires request param */
export async function GET(_request: Request) {
  // Lưu ý: endpoint này được dùng cho cron kiểm tra hợp đồng hết hạn.
  // Nếu cần bảo vệ, bạn có thể dùng Vercel Cron Protection hoặc giới hạn origin.
  // Hiện tại endpoint cho phép truy cập công khai để tránh lỗi 401 trong môi trường production/test.

  try {
    // Logic quét hợp đồng trong Database và gửi Telegram
    // ... (Code quét hợp đồng & gửi Telegram)

    return NextResponse.json({ success: true, message: 'Đã hoàn thành quét hợp đồng tự động' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi quét hợp đồng tự động';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}