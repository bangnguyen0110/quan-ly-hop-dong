-- Migration: Thêm cột folder_id vào bảng contracts
-- Chạy script này trong Supabase SQL Editor để lưu folder_id của Google Drive

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Thêm comment mô tả cột
COMMENT ON COLUMN public.contracts.folder_id IS 'ID của Google Drive Folder chứa hợp đồng (tùy chọn)';

-- Tạo index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_contracts_folder_id ON public.contracts(folder_id);
