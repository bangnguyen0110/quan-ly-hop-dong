export interface Category {
  id: string;
  name: string;
  description?: string;
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
  category_id?: string;
  file_url?: string;
  party_a?: string;
  party_b?: string;
  value: number;
  start_date?: string;
  end_date: string;
  status: 'active' | 'expired' | 'terminated';
  custom_notify_days: number[];
  created_at?: string;
  categories?: Category;
}

export interface TelegramSetting {
  id: string;
  bot_token: string;
  chat_id: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  created_at?: string;
}

export interface Contracts {
  id: string;
  title: string;
  contract_code?: string;
  party_a?: string;
  party_b?: string;
  value: number;
  end_date: string;
  file_url?: string;
  status: string;
  custom_notify_days: number[];
  category_id?: string;
  category?: Category;
  created_at?: string;
}