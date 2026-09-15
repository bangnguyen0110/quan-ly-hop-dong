-- ============================================================
-- MIGRATION: Quản lý Gói Sản phẩm & Dịch Vụ (Service Packages)
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL):
-- It creates the 4 service-package tables (RLS enabled + policies).
-- 1. Bảng service_target_audiences — Đối tượng dịch vụ
-- 2. Bảng service_categories      — Phân loại dịch vụ
-- 3. Bảng service_packages        — Gói dịch vụ (lẻ / combo / đào tạo)
-- 4. Bảng combo_package_items     — Dịch vụ con trong gói combo
-- ============================================================

-- ---------- 1) ĐỐI TƯỢNG (Đối tượng dịch vụ) ----------
create table if not exists service_target_audiences (
  id          uuid primary key default gen_random_uuid(),
  title       text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

-- ---------- 2) PHÂN LOẠI (Loại / Phân loại dịch vụ) ----------
create table if not exists service_categories (
  id           uuid primary key default gen_random_uuid(),
  title        text not null unique,
  description  text,
  package_type text not null default 'single'
    check (package_type in ('single', 'combo', 'training')),
  created_at   timestamptz not null default now()
);

-- ---------- 3) GÓI DỊCH VỰ ----------
create table if not exists service_packages (
  id                uuid primary key default gen_random_uuid(),
  package_code      text,
  name              text not null,
  package_type      text not null default 'single'
    check (package_type in ('single', 'combo', 'training')),
  category_title    text,
  target_audience   text,
  price             text,
  numeric_price     numeric,
  discount_percent  numeric default 0,
  duration          text,
  contract_template text,
  workflow          text,
  related_info      text,
  status            text default 'Đang triển khai',
  created_at        timestamptz not null default now()
);

create index if not exists service_packages_type_idx on service_packages (package_type);
create index if not exists service_packages_code_idx on service_packages (package_code);

-- ---------- 4) DỊCH VỤ CON TRONG GÓI COMBO ----------
create table if not exists combo_package_items (
  id                 uuid primary key default gen_random_uuid(),
  combo_package_id   uuid not null references service_packages (id) on delete cascade,
  service_package_id uuid references service_packages (id) on delete set null,
  service_code       text,
  service_name       text,
  quantity           integer not null default 1,
  unit_price         numeric not null default 0,
  total_price        numeric not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists combo_items_combo_idx on combo_package_items (combo_package_id);

-- ============================================================
-- ROW LEVEL SECURITY — RLS is ALWAYS enabled on all 4 tables (never disabled).
-- ============================================================
alter table service_target_audiences enable row level security;
alter table service_categories      enable row level security;
alter table service_packages        enable row level security;
alter table combo_package_items     enable row level security;

drop policy if exists "service_target_audiences_all" on service_target_audiences;
create policy "service_target_audiences_all"
  on service_target_audiences for all using (true);

drop policy if exists "service_categories_all" on service_categories;
create policy "service_categories_all"
  on service_categories for all using (true);

drop policy if exists "service_packages_all" on service_packages;
create policy "service_packages_all"
  on service_packages for all using (true);

drop policy if exists "combo_package_items_all" on combo_package_items;
create policy "combo_package_items_all"
  on combo_package_items for all using (true);