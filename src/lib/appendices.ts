import { supabase } from './supabase';
import { ContractAppendix } from '@/types/database';

// 1. Lấy danh sách phụ lục hợp đồng (kèm thông tin hợp đồng cha)
export async function getAppendices(): Promise<ContractAppendix[]> {
  const { data, error } = await supabase
    .from('contract_appendices')
    .select('*, contract:contracts(id, title, contract_code)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 2. Lấy danh sách phụ lục theo Hợp đồng cụ thể
export async function getAppendicesByContract(contractId: string): Promise<ContractAppendix[]> {
  const { data, error } = await supabase
    .from('contract_appendices')
    .select('*, contract:contracts(id, title, contract_code)')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 3. Thêm mới phụ lục hợp đồng
export async function createAppendix(appendixData: Omit<ContractAppendix, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('contract_appendices')
    .insert([appendixData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 4. Cập nhật phụ lục hợp đồng
export async function updateAppendix(id: string, appendixData: Partial<ContractAppendix>) {
  const { data, error } = await supabase
    .from('contract_appendices')
    .update(appendixData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 5. Xóa phụ lục hợp đồng
export async function deleteAppendix(id: string) {
  const { error } = await supabase
    .from('contract_appendices')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// 6. Upload file phụ lục hợp đồng (sử dụng chung bucket 'contracts')
export async function uploadAppendixFile(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `appendix_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('contracts')
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage.from('contracts').getPublicUrl(fileName);
  return data.publicUrl;
}
