import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { google_doc_id, apps_script_url, fields, contract, template_id } = body;

    if (!google_doc_id) {
      return NextResponse.json({ error: 'Thiếu google_doc_id' }, { status: 400 });
    }

    if (!apps_script_url) {
      return NextResponse.json({ error: 'Thiếu URL Google Apps Script' }, { status: 400 });
    }

    // Lấy thông tin template từ database nếu có template_id
    let google_folder_id: string | undefined;
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('contract_templates')
        .select('google_folder_id')
        .eq('id', template_id)
        .single();

      if (templateError) {
        console.error('Không lấy được thông tin template:', templateError);
      } else if (template) {
        google_folder_id = template.google_folder_id || undefined;
      }
    }

    // Payload gửi sang Google Apps Script
    const payload = {
      template_id: google_doc_id,
      folder_id: google_folder_id || '',
      contract_code: contract?.contract_code || '',
      party_a: contract?.party_a || '',
      fields: {
        ...fields,
        // Merge thêm thông tin hợp đồng vào fields để GAS có thể dùng
        contract_title: contract?.title || '',
        party_b: contract?.party_b || '',
        value: contract?.value || 0,
        end_date: contract?.end_date || '',
        start_date: contract?.start_date || '',
      },
    };

    // Gửi dữ liệu tới Google Apps Script Webhook
    const response = await fetch(apps_script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.status === 'error') {
      throw new Error(result.message);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
