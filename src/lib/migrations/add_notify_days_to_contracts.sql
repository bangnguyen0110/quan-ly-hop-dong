-- Migration: Thêm cột notify_days cho bảng contracts (mốc ngày báo trước khi hết hạn)
-- Chạy script này trong Supabase SQL Editor trước khi sử dụng thuật toán cron mới.
--
-- 1. Thêm cột notify_days (TEXT, mặc định "1,7,30"): hỗ trợ nhiều mốc ngày cách nhau bởi dấu phẩy
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS notify_days TEXT DEFAULT '1,7,30';

-- 2. Đồng bộ dữ liệu sẵn có từ cột cũ custom_notify_days (nếu notify_days đang trống)
--    Lưu ý: custom_notify_days lưu dạng integer[] trong Postgres.
UPDATE public.contracts
SET notify_days = array_to_string(custom_notify_days, ',')
WHERE (notify_days IS NULL OR notify_days = '')
  AND custom_notify_days IS NOT NULL
  AND array_length(custom_notify_days, 1) > 0;

-- 3. Seed các key cấu hình mặc định cho system_settings (nếu chưa tồn tại)
INSERT INTO public.system_settings ("key", value) VALUES
  ('daily_notification_time', '09:00'),
  ('last_cron_run_date', '')
ON CONFLICT ("key") DO NOTHING;