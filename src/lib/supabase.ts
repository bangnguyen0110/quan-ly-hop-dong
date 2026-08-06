import { createClient } from '@supabase/supabase-js';

// Thêm chuỗi dự phòng để không bị văng lỗi 'supabaseUrl is required' khi Next.js build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);