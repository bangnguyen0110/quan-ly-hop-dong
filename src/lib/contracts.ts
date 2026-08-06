import { supabase } from './supabase';
import { Contract } from '@/types/database';

// Lấy danh sách hợp đồng
export async function getContracts() {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, categories(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Contract[];
}

// Upload file lên Storage
export async function uploadContractFile(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `documents/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('contracts').getPublicUrl(filePath);
  return data.publicUrl;
}

// Tạo hợp đồng mới
export async function createContract(contractData: Omit<Contract, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('contracts')
    .insert([contractData])
    .select();

  if (error) throw error;
  return data[0];
}

// Cập nhật hợp đồng
export async function updateContract(id: string, contractData: Partial<Contract>) {
  const { data, error } = await supabase
    .from('contracts')
    .update(contractData)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

// Xóa hợp đồng
export async function deleteContract(id: string) {
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw error;
}