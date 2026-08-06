import { supabase } from './supabase';
import { Contract, Category } from '@/types/database';

// 1. Lấy danh sách hợp đồng (kèm thông tin Loại hợp đồng)
export async function getContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, category:categories(id, name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 2. Lấy danh sách Loại hợp đồng
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// 3. Thêm Loại hợp đồng mới
export async function createCategory(name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 4. Xóa Loại hợp đồng
export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// 5. Thêm hợp đồng mới
export async function createContract(contractData: Omit<Contract, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('contracts').insert([contractData]).select();
  if (error) throw error;
  return data;
}

// 6. Upload file hợp đồng
export async function uploadContractFile(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  const { error } = await supabase.storage.from('contracts').upload(fileName, file);
  if (error) throw error;

  const { data } = supabase.storage.from('contracts').getPublicUrl(fileName);
  return data.publicUrl;
}

// 7. Xóa hợp đồng
export async function deleteContract(id: string) {
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw error;
}

// 8. Cập nhật / Chỉnh sửa hợp đồng
export async function updateContract(id: string, contractData: Partial<Contract>) {
  const { data, error } = await supabase
    .from('contracts')
    .update(contractData)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}