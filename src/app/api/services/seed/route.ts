import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Danh sách đối tượng sử dụng trích xuất từ Excel
    const audiences = [
      { title: 'Dành cho Cá nhân', description: 'Các khách hàng cá nhân đơn lẻ' },
      { title: 'Dành cho Doanh nhân', description: 'Chuyên gia, cá nhân khởi nghiệp, doanh nhân' },
      { title: 'Dành cho Cá nhân, Doanh nghiệp', description: 'Phục vụ cả nhu cầu cá nhân lẫn doanh nghiệp' },
      { title: 'Dành cho Doanh nghiệp', description: 'Doanh nghiệp SME và công ty tư nhân' },
      { title: 'Dành cho Doanh nghiệp chuỗi, tập đoàn', description: 'Khách hàng quy mô lớn, nhiều chi nhánh' },
      { title: 'Dành cho Sở/Hội, Xã/Phường', description: 'Cơ quan nhà nước, đoàn thể và chính quyền địa phương' },
      { title: 'Dành cho mọi đối tượng', description: 'Không giới hạn quy mô khách hàng' }
    ];

    // 2. Danh sách phân loại dịch vụ trích xuất từ Excel
    const categories = [
      { title: 'I - NETID', package_type: 'single' },
      { title: 'II - HỆ THỐNG BÁN HÀNG (POS)', package_type: 'single' },
      { title: 'III - Website', package_type: 'single' },
      { title: 'IV - NetID AI', package_type: 'single' },
      { title: 'V - Đăng ký website Bộ Công Thương', package_type: 'single' },
      { title: 'VI - Dịch vụ số hóa', package_type: 'single' },
      { title: 'VII - Gói Add - On', package_type: 'single' },
      { title: 'VIII - Socials & Dịch vụ số', package_type: 'single' },
      { title: 'IX - Thiết kế banner, hình ảnh, video', package_type: 'single' },
      { title: 'I - COMBO KÊNH BÁN HÀNG + DATA', package_type: 'combo' },
      { title: 'II - COMBO NETID + DATA', package_type: 'combo' },
      { title: 'III - GIẢI PHÁP CĐS DOANH NGHIỆP TOÀN DIỆN', package_type: 'combo' },
      { title: 'V - HỆ SINH THÁI', package_type: 'combo' },
      { title: 'ĐÀO TẠO', package_type: 'training' }
    ];

    await supabase.from('service_target_audiences').upsert(audiences, { onConflict: 'title' });
    await supabase.from('service_categories').upsert(categories, { onConflict: 'title' });

    return NextResponse.json({ success: true, message: 'Đã khởi tạo danh mục và đối tượng mẫu thành công!' });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Đã xảy ra lỗi không xác định khi seed dữ liệu.',
      },
      { status: 500 }
    );
  }
}