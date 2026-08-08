import { z } from 'zod';

export const ContractSchema = z.object({
  title: z.string().min(3, 'Tên hợp đồng phải từ 3 ký tự').max(200),
  contract_code: z.string().optional(),
  value: z.number().nonnegative('Giá trị không được âm'),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ngày không hợp lệ'),
  custom_notify_days: z.array(z.number()),
});

export const AppendixSchema = z.object({
    contract_id: z.string().uuid('Vui lòng chọn hợp đồng'),
  title: z.string().min(3, 'Tên phụ lục phải từ 3 ký tự').max(200),
  appendix_code: z.string().optional().nullable(),
  value: z.number().nonnegative('Giá trị phụ lục không được âm'),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ngày không hợp lệ'),
  content: z.string().optional().nullable(),
  file_url: z.string().url('Đường dẫn file không hợp lệ').optional().nullable(),
  update_parent_contract: z.boolean().optional(),
});