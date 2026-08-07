-- Migration: Thêm cột google_folder_id vào bảng contract_templates
-- Chạy script này trong Supabase SQL Editor trước khi sử dụng tính năng Folder ID

ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS google_folder_id TEXT;

-- Thêm comment mô tả cột
COMMENT ON COLUMN public.contract_templates.google_folder_id IS 'ID của Google Drive Folder chứa hợp đồng (tùy chọn)';
