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
  // Mốc ngày báo trước hết hạn (mặc định "1,7,30"), lưu dạng TEXT hoặc INT[]
  notify_days?: string | number[] | null;
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

// ============================================================
// QUẢN LÝ GÓI SẺRVIС VÀ DỊCH VỰ (Service Packages)
// ============================================================

export type ServicePackageType = 'single' | 'combo' | 'training';

export interface ServiceTargetAudience {
  id: string;
  title: string;
  description?: string;
  created_at?: string;
}

export interface ServiceCategory {
  id: string;
  title: string;
  description?: string;
  package_type?: ServicePackageType;
  created_at?: string;
}

export interface ServicePackage {
  id: string;
  package_code?: string;           // Mã gói
  name: string;                     // Tên gói
  package_type: ServicePackageType; // Loại gói: lẻ / combo / đào tạo
  category_title?: string;          // Phân loại dịch vụ
  target_audience?: string;         // Đối tượng
  price?: string;                   // Giá hiển thị (VD: "20.750.000đ/năm")
  numeric_price?: number;           // Giá số (dùng để cập nhật / tính tổng)
  discount_percent?: number;        // % Giảm (combo)
  duration?: string;                // Thời gian triển khai
  contract_template?: string;       // Hợp đồng mẫu
  workflow?: string;                // Quy trình triển khai
  related_info?: string;            // Thông tin liên quan
  status?: string;                  // Status triển khai
  created_at?: string;
  combo_items?: ComboPackageItem[]; // Dịch vụ con (combo)
}

export interface ComboPackageItem {
  id: string;
  combo_package_id: string;          // FK -> service_packages.id (gói combo)
  service_package_id?: string;       // FK -> service_packages.id (dịch vụ lẻ)
  service_code?: string;
  service_name?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  created_at?: string;
}
