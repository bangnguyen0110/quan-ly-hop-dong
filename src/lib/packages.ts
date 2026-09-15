import { supabase } from './supabase';
import { z } from 'zod';
import {
  ServicePackage,
  ServiceCategory,
  ServiceTargetAudience,
  ServicePackageType,
} from '@/types/database';

// ============================================================
// ZOD VALIDATION
// ============================================================

export const ServiceTargetAudienceSchema = z.object({
  title: z.string().min(2, 'Tiêu đề đối tượng phải từ 2 ký tự').max(200),
  description: z.string().max(1000).optional().nullable(),
});

export const ServiceCategorySchema = z.object({
  title: z.string().min(2, 'Tiêu đề loại dịch vụ phải từ 2 ký tự').max(200),
  description: z.string().max(1000).optional().nullable(),
});

export const ServicePackageSchema = z.object({
  package_code: z.string().max(50).optional().nullable(),
  name: z.string().min(2, 'Tên dịch vụ phải từ 2 ký tự').max(300),
  package_type: z.enum(['single', 'combo', 'training'] as const),
  category_title: z.string().max(200).optional().nullable(),
  target_audience: z.string().max(200).optional().nullable(),
  price: z.string().max(100).optional().nullable(),
  numeric_price: z.coerce.number().nonnegative().optional().nullable(),
  discount_percent: z.coerce.number().min(0).max(100).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
  contract_template: z.string().max(300).optional().nullable(),
  workflow: z.string().max(1000).optional().nullable(),
  related_info: z.string().max(2000).optional().nullable(),
  status: z.string().max(100).optional().nullable(),
});

export const ComboPackageItemSchema = z.object({
  combo_package_id: z.string().uuid(),
  service_package_id: z.string().uuid().optional().nullable(),
  service_code: z.string().max(50).optional().nullable(),
  service_name: z.string().max(300).optional().nullable(),
  quantity: z.coerce.number().int().min(1),
  unit_price: z.coerce.number().nonnegative(),
  total_price: z.coerce.number().nonnegative().optional().nullable(),
});

// ============================================================
// QUERIES — Tổng quan gói (Khắc phục lỗi PostgREST PGRST201)
// ============================================================

export async function getServicePackages(): Promise<ServicePackage[]> {
  // 1. Tải danh sách gói từ bảng service_packages
  const { data: pkgs, error: pkgErr } = await supabase
    .from('service_packages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (pkgErr) throw pkgErr;
  if (!pkgs || pkgs.length === 0) return [];

  // 2. Tải danh sách combo_items độc lập để ghép nối an toàn
  try {
    const { data: items } = await supabase
      .from('combo_package_items')
      .select('*');

    if (items && items.length > 0) {
      const itemsMap: Record<string, any[]> = {};
      for (const item of items) {
        if (!itemsMap[item.combo_package_id]) {
          itemsMap[item.combo_package_id] = [];
        }
        itemsMap[item.combo_package_id].push(item);
      }

      return pkgs.map((p) => ({
        ...p,
        combo_items: itemsMap[p.id] || [],
      })) as ServicePackage[];
    }
  } catch (err) {
    console.warn('Không thể nạp bảng phụ combo_package_items:', err);
  }

  return (pkgs as ServicePackage[]) || [];
}

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .order('title', { ascending: true });

  if (error) throw error;
  return (data as ServiceCategory[]) || [];
}

export async function getServiceTargetAudiences(): Promise<ServiceTargetAudience[]> {
  const { data, error } = await supabase
    .from('service_target_audiences')
    .select('*')
    .order('title', { ascending: true });

  if (error) throw error;
  return (data as ServiceTargetAudience[]) || [];
}

// ============================================================
// MUTATIONS — Popup tác vụ nhanh (Tổng quan)
// ============================================================

export async function createServiceTargetAudience(
  input: z.infer<typeof ServiceTargetAudienceSchema>
): Promise<ServiceTargetAudience> {
  const validated = ServiceTargetAudienceSchema.parse(input);
  const { data, error } = await supabase
    .from('service_target_audiences')
    .insert([{ title: validated.title, description: validated.description || null }])
    .select()
    .single();

  if (error) throw error;
  return data as ServiceTargetAudience;
}

export async function createServiceCategory(
  input: z.infer<typeof ServiceCategorySchema>
): Promise<ServiceCategory> {
  const validated = ServiceCategorySchema.parse(input);
  const { data, error } = await supabase
    .from('service_categories')
    .insert([
      {
        title: validated.title,
        description: validated.description || null,
        package_type: 'single' as ServicePackageType,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as ServiceCategory;
}

export async function createServicePackage(
  input: z.infer<typeof ServicePackageSchema>
): Promise<ServicePackage> {
  const validated = ServicePackageSchema.parse(input);
  const { data, error } = await supabase
    .from('service_packages')
    .insert([
      {
        package_code: validated.package_code || null,
        name: validated.name,
        package_type: validated.package_type,
        category_title: validated.category_title || null,
        target_audience: validated.target_audience || null,
        price: validated.price || null,
        numeric_price: validated.numeric_price ?? null,
        discount_percent: validated.discount_percent ?? null,
        duration: validated.duration || null,
        contract_template: validated.contract_template || null,
        workflow: validated.workflow || null,
        related_info: validated.related_info || null,
        status: validated.status || 'Đang triển khai',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as ServicePackage;
}

export async function createComboPackageWithItems(
  packageInput: z.infer<typeof ServicePackageSchema>,
  items: Array<{
    service_package_id: string;
    service_code?: string;
    service_name?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>
): Promise<ServicePackage> {
  const comboValidated = ServicePackageSchema.parse(packageInput);
  const { data: combo, error: comboError } = await supabase
    .from('service_packages')
    .insert([
      {
        package_code: comboValidated.package_code || null,
        name: comboValidated.name,
        package_type: 'combo',
        category_title: comboValidated.category_title || null,
        target_audience: comboValidated.target_audience || null,
        price: comboValidated.price || null,
        numeric_price: comboValidated.numeric_price ?? null,
        discount_percent: comboValidated.discount_percent ?? null,
        duration: comboValidated.duration || null,
        contract_template: comboValidated.contract_template || null,
        workflow: comboValidated.workflow || null,
        related_info: comboValidated.related_info || null,
        status: 'Đang triển khai',
      },
    ])
    .select()
    .single();

  if (comboError) throw comboError;
  const comboRow = combo as ServicePackage;

  if (items.length > 0) {
    const rows = items.map((item) => ({
      combo_package_id: comboRow.id,
      service_package_id: item.service_package_id,
      service_code: item.service_code || null,
      service_name: item.service_name || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));
    const { error: itemsError } = await supabase.from('combo_package_items').insert(rows);
    if (itemsError) throw itemsError;
  }

  return comboRow;
}

// ============================================================
// HELPERS
// ============================================================

export function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} đ`;
}

export function packageTypeLabel(type?: ServicePackageType | string): string {
  switch (type) {
    case 'single':
      return 'Dịch vụ lẻ';
    case 'combo':
      return 'Combo';
    case 'training':
      return 'Đào tạo';
    default:
      return '—';
  }
}