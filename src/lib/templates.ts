import { supabase } from './supabase';
import { ContractTemplate } from '@/types/database';

// Lấy danh sách mẫu, ưu tiên mẫu dùng gần đây nhất (last_used_at) lên đầu
export async function getTemplates(): Promise<ContractTemplate[]> {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .order('last_used_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

// Tạo mẫu mới
export async function createTemplate(templateData: Omit<ContractTemplate, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('contract_templates')
    .insert([{ ...templateData, last_used_at: new Date().toISOString() }])
    .select();
  if (error) throw error;
  return data;
}

// Cập nhật / Sửa mẫu hợp đồng
export async function updateTemplate(id: string, templateData: Partial<ContractTemplate>) {
  const { data, error } = await supabase
    .from('contract_templates')
    .update({ ...templateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
}

// Cập nhật mốc thời gian khi mẫu được sử dụng để tạo hợp đồng
export async function markTemplateUsed(id: string) {
  const { error } = await supabase
    .from('contract_templates')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Xóa mẫu
export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('contract_templates').delete().eq('id', id);
  if (error) throw error;
}