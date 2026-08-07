import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Kiểm tra Secret Key từ Header
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  // ... Logic quét hợp đồng giữ nguyên ...
}