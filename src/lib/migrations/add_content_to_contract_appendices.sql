-- Migration: Them cot content vao bang contract_appendices
-- Chay script nay trong Supabase SQL Editor truoc khi su dung tinh nang ghi noi dung phu luc
-- Ghi chu: Bao loi "Could not find the 'content' column of 'contract_appendices'" nghia la bang
-- chua co cot nay.

ALTER TABLE public.contract_appendices
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Them comment mo ta cot
COMMENT ON COLUMN public.contract_appendices.content IS 'Ghi chu / Noi dung cua phu luc hop dong (tuong ung field content trong form)';
