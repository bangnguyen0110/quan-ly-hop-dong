export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface ContractTemplate {
  id: string;
  title: string;
  category_id?: string;
  content: string;
  created_at?: string;
}

export interface Contract {
  id: string;
  title: string;
  contract_code?: string;
  party_a?: string;
  party_b?: string;
  value: number;
  start_date?: string;
  end_date: string;
  file_url?: string;
  status: string; // Hoặc 'active' | 'expired' | 'terminated'
  custom_notify_days: number[];
  category_id?: string;
  category?: Category;
  created_at?: string;
}

export interface TelegramSettings {
  id?: string;
  bot_token: string;
  chat_id: string;
  is_active: boolean;
  message_template?: string;
  notify_time?: string; // Ví dụ: "11:35"
  updated_at?: string;
}

// Bổ sung Alias để tránh lỗi nếu có nơi dùng tên số ít TelegramSetting
export type TelegramSetting = TelegramSettings;