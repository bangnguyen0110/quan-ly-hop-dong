-- Migration: Tao bang system_settings de luu cau hinh dong (key-value)
-- Chay script nay trong Supabase SQL Editor truoc khi su dung cau hinh Telegram dong
-- Dac biet: giup luu TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID tu trang /telegram ma khong can .env.local

-- 1. Tao bang (neu chua co)
--    key la PRIMARY KEY (chuoi ngan), value luu gia tri cau hinh, updated_at tu cap nhat
CREATE TABLE IF NOT EXISTS public.system_settings (
  "key" VARCHAR PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ham tu dong cap nhat updated_at khi UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Cho phep ANON (client phia truoc) SELECT / INSERT / UPDATE tren bang nay
--    (an toan vi gia tri nay khong nhan nhat nhanh - khong phai service role key)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_policy" ON public.system_settings;
CREATE POLICY "system_settings_select_policy" ON public.system_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "system_settings_insert_policy" ON public.system_settings;
CREATE POLICY "system_settings_insert_policy" ON public.system_settings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "system_settings_update_policy" ON public.system_settings;
CREATE POLICY "system_settings_update_policy" ON public.system_settings
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "system_settings_delete_policy" ON public.system_settings;
CREATE POLICY "system_settings_delete_policy" ON public.system_settings
  FOR DELETE USING (true);

-- 4. Seed 2 ban ghi mac dinh: bot token + chat id (gia tri rong)
--    Neu da co ban ghi (vi du: da cap nhat tay) thi giu nguyen gia tri hien co
INSERT INTO public.system_settings ("key", value) VALUES
  ('telegram_bot_token', ''),
  ('telegram_chat_id', '')
ON CONFLICT ("key") DO NOTHING;