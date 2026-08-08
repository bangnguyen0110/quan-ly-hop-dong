export interface FieldDefinition {
  key: string;       // Mã biến (VD: tax_code -> trong Doc dùng {{tax_code}})
  label: string;     // Nhãn hiển thị (VD: Mã số thuế)
  type: 'text' | 'number' | 'date'; 
}

export interface ContractTemplate {
  id: string;
  name: string;
  google_doc_id: string;
  google_folder_id?: string;
  apps_script_url?: string;
  field_definitions: FieldDefinition[];
  created_at?: string;
  updated_at?: string;
  last_used_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
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
  status: string;
  custom_notify_days: number[];
  category_id?: string;
  category?: Category;
  custom_fields?: Record<string, unknown>; // Lưu dữ liệu trường động JSONB
  template_id?: string; // ID mẫu hợp đồng sử dụng
  folder_id?: string; // ID thư mục Google Drive (nếu có)
  created_at?: string;
  appendices?: ContractAppendix[];
}

export interface ContractAppendix {
  id: string;
  contract_id: string;
  title: string;
  appendix_code?: string;
  value: number;
  end_date: string;
  file_url?: string;
  content?: string;
  created_at?: string;
  contract?: Contract;
}

export interface TelegramSettings {
  id?: string;
  bot_token: string;
  chat_id: string;
  is_active: boolean;
  message_template?: string;
  notify_time?: string;
  updated_at?: string;
}

export type TelegramSetting = TelegramSettings;
