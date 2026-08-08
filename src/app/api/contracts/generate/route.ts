import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contract_id } = body;

    // 1. Validate contract_id
    if (!contract_id) {
      return NextResponse.json({ error: 'Thiếu contract_id' }, { status: 400 });
    }

    // 2. Truy vấn bảng contracts kèm thông tin template
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        template:contract_templates(
          id,
          google_doc_id,
          google_folder_id,
          apps_script_url
        )
      `)
      .eq('id', contract_id)
      .single();

    if (contractError || !contract) {
      console.error('Lỗi khi truy vấn hợp đồng:', contractError);
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng này!' }, { status: 404 });
    }

    // Kiểm tra contract có template_id không
    if (!contract.template_id) {
      return NextResponse.json(
        { error: 'Hợp đồng này chưa chọn Mẫu hợp đồng để xuất file!' },
        { status: 400 }
      );
    }

    // Lấy thông tin template
    // Định nghĩa kiểu rõ ràng dựa trên bảng contract_templates
    type TemplateInfo = {
      google_doc_id: string;
      google_folder_id?: string;
      apps_script_url?: string;
    };
    const template = contract.template as TemplateInfo | null;
    if (!template) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin Mẫu hợp đồng!' },
        { status: 404 }
      );
    }

    const google_doc_id = template.google_doc_id;
    const google_folder_id = template.google_folder_id || '';
    const apps_script_url = template.apps_script_url || process.env.APPS_SCRIPT_URL || '';

    // Validate required fields
    if (!google_doc_id) {
      return NextResponse.json(
        { error: 'Mẫu hợp đồng này chưa cấu hình Google Doc ID!' },
        { status: 400 }
      );
    }

    if (!apps_script_url) {
      return NextResponse.json(
        { error: 'Thiếu URL Google Apps Script (cả trong DB và environment variable)' },
        { status: 400 }
      );
    }

    // 4. Tổng hợp bảng dữ liệu fields
    const fields: Record<string, string | number> = {
      // Các trường cấp cao nhất
      title: contract.title || '',
      contract_code: contract.contract_code || '',
      party_a: contract.party_a || '',
      party_b: contract.party_b || '',
      value: contract.value || 0,
      end_date: contract.end_date || '',
      // Trải toàn bộ custom_fields vào fields
      ...(contract.custom_fields as Record<string, string | number> || {}),
    };

    // 5. Payload gửi sang Google Apps Script
    const payload = {
      template_id: google_doc_id,
      folder_id: google_folder_id,
      contract_code: contract.contract_code || 'HD',
      party_a: contract.party_a || 'BenA',
      fields,
    };

    console.log('📤 Gửi payload đến Google Apps Script:', JSON.stringify(payload, null, 2));

    // Gọi Google Apps Script Webhook
    const response = await fetch(apps_script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.status === 'error') {
      console.error('❌ Lỗi từ Google Apps Script:', result.message);
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    // 6. Cập nhật doc_url và pdf_url vào bảng contracts
    const updateData: { doc_url?: string; pdf_url?: string } = {};
    if (result.doc_url) {
      updateData.doc_url = result.doc_url;
    }
    if (result.pdf_url) {
      updateData.pdf_url = result.pdf_url;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contract_id);

      if (updateError) {
        console.error('⚠️ Lỗi khi cập nhật URL vào database:', updateError);
      } else {
        console.log('✅ Đã cập nhật doc_url và pdf_url vào database');
      }
    }

    // Trả về kết quả thành công
    return NextResponse.json({
      success: true,
      doc_url: result.doc_url || null,
      pdf_url: result.pdf_url || null,
      folder_id: google_folder_id || null,
    });

  } catch (error: unknown) {
    console.error('❌ Lỗi trong API generate contract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo hợp đồng';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
