'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getServicePackages,
  getServiceCategories,
  getServiceTargetAudiences,
  createServiceTargetAudience,
  createServiceCategory,
  createServicePackage,
  formatVnd,
  packageTypeLabel,
} from '@/lib/packages';
import {
  ServicePackage,
  ServiceCategory,
  ServiceTargetAudience,
  ServicePackageType,
} from '@/types/database';
import {
  Boxes,
  Layers,
  GitCompare,
  PackagePlus,
  GraduationCap,
  Users,
  Tag,
  Search,
  Plus,
  X,
  Loader2,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
  SlidersHorizontal,
  Eye,
  Sparkles,
  PackageOpen,
  BookCheck,
  AlertCircle,
  RotateCcw,
  Code2,
  Copy,
  Check,
  Edit2,
  Trash2,
  LayoutGrid,
  LayoutList,
  Clock,
} from 'lucide-react';

type ModalType = 'audience' | 'category' | 'service' | 'sql' | null;

type SortField = 'package_code' | 'name' | 'numeric_price' | 'created_at';
type SortDir = 'asc' | 'desc';

const SQL_SETUP_SCRIPT = `-- 1. BẢNG ĐỐI TƯỢNG SỬ DỤNG
CREATE TABLE IF NOT EXISTS service_target_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG PHÂN LOẠI / DANH MỤC DỊCH VỤ
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  package_type TEXT DEFAULT 'single',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG GÓI DỊCH VỤ & SẢN PHẨM (SP/DV)
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_code TEXT,
  name TEXT NOT NULL,
  package_type TEXT DEFAULT 'single',
  category_title TEXT,
  target_audience TEXT,
  description TEXT,
  price TEXT,
  numeric_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  duration TEXT,
  contract_template TEXT,
  workflow TEXT,
  related_info TEXT,
  status TEXT DEFAULT 'Đang xây',
  missing_documents TEXT,
  notes TEXT,
  expected_results TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG CHI TIẾT DỊCH VỤ CON TRONG GÓI COMBO
CREATE TABLE IF NOT EXISTS combo_package_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_package_id UUID REFERENCES service_packages(id) ON DELETE CASCADE,
  service_package_id UUID REFERENCES service_packages(id) ON DELETE SET NULL,
  service_code TEXT,
  service_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TẮT ROW LEVEL SECURITY (RLS)
ALTER TABLE service_target_audiences DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE combo_package_items DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';`;

export default function PackagesOverviewPage() {
  // ---------- Dữ liệu ----------
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [audiences, setAudiences] = useState<ServiceTargetAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbNotice, setDbNotice] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // ---------- Toolbar: Search + Filter + Sort + View Mode ----------
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | ServicePackageType>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAudience, setFilterAudience] = useState('all');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Mặc định là Grid

  // ---------- Popup tác vụ nhanh ----------
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Detail modal — chi tiết gói (Eye)
  const [detailsPkg, setDetailsPkg] = useState<ServicePackage | null>(null);

  // Popup: Đối tượng mới & Chỉnh sửa
  const [editingAudienceId, setEditingAudienceId] = useState<string | null>(null);
  const [audTitle, setAudTitle] = useState('');
  const [audDescription, setAudDescription] = useState('');

  // Popup: Loại dịch vụ mới & Chỉnh sửa
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catTitle, setCatTitle] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catType, setCatType] = useState<ServicePackageType>('single');

  // Popup: Dịch vụ mới & Chỉnh sửa
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [svcCode, setSvcCode] = useState('');
  const [svcName, setSvcName] = useState('');
  const [svcType, setSvcType] = useState<ServicePackageType>('single');
  const [svcCategory, setSvcCategory] = useState('');
  // CHỌN NHIỀU ĐỐI TƯỢNG (Multi-select)
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [svcPrice, setSvcPrice] = useState('');
  const [svcPriceDisplay, setSvcPriceDisplay] = useState('');
  const [svcDuration, setSvcDuration] = useState('');
  const [svcContractTemplate, setSvcContractTemplate] = useState('');
  const [svcWorkflow, setSvcWorkflow] = useState('');
  const [svcRelatedInfo, setSvcRelatedInfo] = useState('');
  const [svcStatus, setSvcStatus] = useState('Đang xây');

  useEffect(() => {
    fetchData();
  }, []);

  // ============================================================
  // Hàm tải dữ liệu an toàn — Fallback trực tiếp qua Supabase
  // ============================================================
  async function fetchData() {
    try {
      setLoading(true);
      setDbNotice(null);

      const results = await Promise.allSettled([
        getServicePackages(),
        getServiceCategories(),
        getServiceTargetAudiences(),
      ]);

      const errList: string[] = [];

      // 1. Gói dịch vụ
      if (results[0].status === 'fulfilled') {
        setPackages(results[0].value || []);
      } else {
        try {
          const { data: directData, error: directErr } = await supabase
            .from('service_packages')
            .select('*')
            .order('created_at', { ascending: false });

          if (!directErr && directData) {
            setPackages(directData as ServicePackage[]);
          } else {
            throw directErr || results[0].reason;
          }
        } catch (fallbackErr: any) {
          const msg = fallbackErr?.message || results[0].reason?.message || String(results[0].reason);
          console.warn('Lưu ý service_packages:', msg);
          errList.push(`Gói SP/DV: ${msg}`);
          setPackages([]);
        }
      }

      // 2. Phân loại danh mục
      if (results[1].status === 'fulfilled') {
        setCategories(results[1].value || []);
      } else {
        try {
          const { data: catData, error: catErr } = await supabase
            .from('service_categories')
            .select('*')
            .order('title', { ascending: true });

          if (!catErr && catData) {
            setCategories(catData as ServiceCategory[]);
          } else {
            throw catErr || results[1].reason;
          }
        } catch (fallbackErr: any) {
          const msg = fallbackErr?.message || results[1].reason?.message || String(results[1].reason);
          console.warn('Lưu ý service_categories:', msg);
          errList.push(`Phân loại: ${msg}`);
          setCategories([]);
        }
      }

      // 3. Đối tượng khách hàng
      if (results[2].status === 'fulfilled') {
        setAudiences(results[2].value || []);
      } else {
        try {
          const { data: audData, error: audErr } = await supabase
            .from('service_target_audiences')
            .select('*')
            .order('title', { ascending: true });

          if (!audErr && audData) {
            setAudiences(audData as ServiceTargetAudience[]);
          } else {
            throw audErr || results[2].reason;
          }
        } catch (fallbackErr: any) {
          const msg = fallbackErr?.message || results[2].reason?.message || String(results[2].reason);
          console.warn('Lưu ý service_target_audiences:', msg);
          errList.push(`Đối tượng: ${msg}`);
          setAudiences([]);
        }
      }

      if (errList.length > 0) {
        setDbNotice(errList.join(' — '));
      }
    } catch (err: any) {
      console.warn('Lỗi kết nối CSDL:', err?.message || String(err));
      setDbNotice('Lỗi kết nối CSDL: ' + (err?.message || 'Vui lòng kiểm tra lại Supabase.'));
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // Thống kê tổng số gói
  // ============================================================
  const totalPackages = packages.length;
  const countSingle = packages.filter((p) => p.package_type === 'single').length;
  const countCombo = packages.filter((p) => p.package_type === 'combo').length;
  const countTraining = packages.filter((p) => p.package_type === 'training').length;

  const totalPortfolioValue = packages.reduce(
    (sum, p) => sum + (Number(p.numeric_price) || 0),
    0
  );

  // ============================================================
  // Filter / Sort
  // ============================================================
  const filteredPackages = packages
    .filter((p) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term === '' ||
        (p.package_code || '').toLowerCase().includes(term) ||
        (p.name || '').toLowerCase().includes(term) ||
        (p.category_title || '').toLowerCase().includes(term) ||
        (p.target_audience || '').toLowerCase().includes(term) ||
        (p.workflow || '').toLowerCase().includes(term) ||
        (p.contract_template || '').toLowerCase().includes(term);

      const matchesType = filterType === 'all' || p.package_type === filterType;
      const matchesCategory =
        filterCategory === 'all' || (p.category_title || '') === filterCategory;
      const matchesAudience =
        filterAudience === 'all' || (p.target_audience || '') === filterAudience;

      return matchesSearch && matchesType && matchesCategory && matchesAudience;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'created_at') {
        const va = new Date(a.created_at || '').getTime() || 0;
        const vb = new Date(b.created_at || '').getTime() || 0;
        return (va - vb) * dir;
      }
      if (sortBy === 'numeric_price') {
        const va = Number(a.numeric_price) || 0;
        const vb = Number(b.numeric_price) || 0;
        return (va - vb) * dir;
      }
      const va = String(a[sortBy] || '').toLowerCase();
      const vb = String(b[sortBy] || '').toLowerCase();
      return va.localeCompare(vb) * dir;
    });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? <ArrowUpNarrowWide size={13} /> : <ArrowDownNarrowWide size={13} />;
  };

  const typeBadgeClass = (type?: ServicePackageType | string) => {
    switch (type) {
      case 'single':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'combo':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'training':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
  };

  const statusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Đã hoàn chỉnh':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Đang chỉnh sửa':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };

  const displayPrice = (p: ServicePackage) => {
    if (p.price && p.price.trim()) return p.price.trim();
    return p.numeric_price ? formatVnd(Number(p.numeric_price)) : 'Liên hệ';
  };

  const resetModalStates = () => {
    setModalError(null);
    setEditingAudienceId(null);
    setAudTitle('');
    setAudDescription('');

    setEditingCategoryId(null);
    setCatTitle('');
    setCatDescription('');
    setCatType('single');

    setEditingPackageId(null);
    setSvcCode('');
    setSvcName('');
    setSvcType('single');
    setSvcCategory('');
    setSelectedAudiences([]);
    setSvcPrice('');
    setSvcPriceDisplay('');
    setSvcDuration('');
    setSvcContractTemplate('');
    setSvcWorkflow('');
    setSvcRelatedInfo('');
    setSvcStatus('Đang xây');
  };

  // ============================================================
  // XỬ LÝ ĐỐI TƯỢNG (THÊM / SỬA / XÓA)
  // ============================================================
  const handleEditAudience = (item: ServiceTargetAudience) => {
    setEditingAudienceId(item.id);
    setAudTitle(item.title);
    setAudDescription(item.description || '');
    setModalError(null);
  };

  const handleDeleteAudience = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đối tượng "${title}"?`)) return;
    try {
      const { error } = await supabase.from('service_target_audiences').delete().eq('id', id);
      if (error) throw error;
      if (editingAudienceId === id) {
        setEditingAudienceId(null);
        setAudTitle('');
        setAudDescription('');
      }
      await fetchData();
    } catch (err: any) {
      alert('Không thể xóa đối tượng: ' + err.message);
    }
  };

  const handleSaveAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      if (editingAudienceId) {
        const { error } = await supabase
          .from('service_target_audiences')
          .update({
            title: audTitle.trim(),
            description: audDescription.trim() || null,
          })
          .eq('id', editingAudienceId);
        if (error) throw error;
        setEditingAudienceId(null);
      } else {
        const { error } = await supabase
          .from('service_target_audiences')
          .insert([{ title: audTitle.trim(), description: audDescription.trim() || null }]);
        if (error) throw error;
      }
      setAudTitle('');
      setAudDescription('');
      await fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Lỗi lưu đối tượng');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // XỬ LÝ LOẠI DỊCH VỤ (THÊM / SỬA / XÓA)
  // ============================================================
  const handleEditCategory = (item: ServiceCategory) => {
    setEditingCategoryId(item.id);
    setCatTitle(item.title);
    setCatDescription(item.description || '');
    setCatType(item.package_type || 'single');
    setModalError(null);
  };

  const handleDeleteCategory = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa loại dịch vụ "${title}"?`)) return;
    try {
      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) throw error;
      if (editingCategoryId === id) {
        setEditingCategoryId(null);
        setCatTitle('');
        setCatDescription('');
      }
      await fetchData();
    } catch (err: any) {
      alert('Không thể xóa loại dịch vụ: ' + err.message);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      if (editingCategoryId) {
        const { error } = await supabase
          .from('service_categories')
          .update({
            title: catTitle.trim(),
            description: catDescription.trim() || null,
            package_type: catType,
          })
          .eq('id', editingCategoryId);
        if (error) throw error;
        setEditingCategoryId(null);
      } else {
        const { error } = await supabase
          .from('service_categories')
          .insert([
            {
              title: catTitle.trim(),
              description: catDescription.trim() || null,
              package_type: catType,
            },
          ]);
        if (error) throw error;
      }
      setCatTitle('');
      setCatDescription('');
      await fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Lỗi lưu loại dịch vụ');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // XỬ LÝ GÓI DỊCH VỤ (THÊM / SỬA / XÓA)
  // ============================================================
  const handleEditPackage = (pkg: ServicePackage) => {
    setEditingPackageId(pkg.id);
    setSvcCode(pkg.package_code || '');
    setSvcName(pkg.name || '');
    setSvcType(pkg.package_type || 'single');
    setSvcCategory(pkg.category_title || '');

    // Khởi tạo mảng các đối tượng đã chọn từ chuỗi có dấu phẩy
    if (pkg.target_audience) {
      const parts = pkg.target_audience
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      setSelectedAudiences(parts);
    } else {
      setSelectedAudiences([]);
    }

    setSvcPrice(pkg.numeric_price ? String(pkg.numeric_price) : '');
    setSvcPriceDisplay(pkg.price || '');
    setSvcDuration(pkg.duration || '');
    setSvcContractTemplate(pkg.contract_template || '');
    setSvcWorkflow(pkg.workflow || '');
    setSvcRelatedInfo(pkg.related_info || '');
    setSvcStatus(pkg.status || 'Đang xây');
    setModalError(null);
    setActiveModal('service');
  };

  const handleDeletePackage = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa gói dịch vụ "${name}"?`)) return;
    try {
      const { error } = await supabase.from('service_packages').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert('Không thể xóa gói dịch vụ: ' + (err.message || String(err)));
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      const numericPrice =
        svcPrice.trim() === '' ? null : Number(svcPrice.trim().replace(/[^0-9.]/g, ''));
      const displayPriceText =
        svcPriceDisplay.trim() ||
        (numericPrice && numericPrice > 0 ? formatVnd(numericPrice) : '');

      // Gộp các đối tượng đã chọn thành chuỗi
      const targetAudienceStr = selectedAudiences.join(', ');

      const payload = {
        package_code: svcCode.trim() || null,
        name: svcName.trim(),
        package_type: svcType,
        category_title: svcCategory || null,
        target_audience: targetAudienceStr || null,
        price: displayPriceText || null,
        numeric_price: numericPrice,
        duration: svcDuration.trim() || null,
        contract_template: svcContractTemplate.trim() || null,
        workflow: svcWorkflow.trim() || null,
        related_info: svcRelatedInfo.trim() || null,
        status: svcStatus,
      };

      if (editingPackageId) {
        const { error } = await supabase
          .from('service_packages')
          .update(payload)
          .eq('id', editingPackageId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('service_packages').insert([payload]);
        if (error) throw error;
      }

      setActiveModal(null);
      resetModalStates();
      await fetchData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Dữ liệu không hợp lệ');
    } finally {
      setSaving(false);
    }
  };

  const handleCopySql = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ================= THÔNG BÁO CSDL NẾU CÓ LỖI ================= */}
      {dbNotice && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs font-medium animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Lưu ý CSDL:</strong> {dbNotice}
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => setActiveModal('sql')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-200/70 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition"
            >
              <Code2 size={13} /> Xem mã SQL cần chạy
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <RotateCcw size={13} /> Thử lại
            </button>
          </div>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-blue-600 flex items-center gap-1.5">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Quản lý gói SP/DV</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Boxes className="text-emerald-600" size={28} />
            Tổng quan Gói Sản Phẩm & Dịch Vụ (SP/DV)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bảng chi tiết dữ liệu gói dịch vụ — tương tự file Excel
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/packages/new"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-xl text-xs transition"
          >
            <PackagePlus size={15} /> Gói lẻ / Đào tạo
          </Link>
          <Link
            href="/packages/combo/new"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3.5 py-2 rounded-xl text-xs transition shadow-sm"
          >
            <Layers size={15} /> Tạo gói Combo
          </Link>
          <Link
            href="/packages/compare"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-xl text-xs transition"
          >
            <GitCompare size={15} /> So sánh gói
          </Link>
        </div>
      </div>

      {/* ================= THỐNG KÊ ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] text-slate-400 font-medium">Tổng gói</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalPackages}</p>
          <p className="text-[10px] text-slate-400">Giá trị: {formatVnd(totalPortfolioValue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] text-slate-400 font-medium">Dịch vụ lẻ</p>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{countSingle}</p>
          <p className="text-[10px] text-blue-500 flex items-center gap-1">
            <PackagePlus size={12} /> Gói đơn
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] text-slate-400 font-medium">Combo / Custom</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">{countCombo}</p>
          <p className="text-[10px] text-emerald-600 flex items-center gap-1">
            <Layers size={12} /> Gói combo
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] text-slate-400 font-medium">Đào tạo</p>
          <p className="text-2xl font-bold text-amber-600 mt-0.5">{countTraining}</p>
          <p className="text-[10px] text-amber-600 flex items-center gap-1">
            <GraduationCap size={12} /> Gói đào tạo
          </p>
        </div>
      </div>

      {/* ================= TÁC VỤ NHANH ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Tác vụ nhanh</h2>
          <p className="text-[11px] text-slate-400">
            Quản lý đối tượng, loại dịch vụ và tạo mới gói dịch vụ
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              resetModalStates();
              setActiveModal('audience');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl text-xs transition border border-blue-200"
          >
            <Users size={15} /> Quản lý đối tượng
          </button>
          <button
            onClick={() => {
              resetModalStates();
              setActiveModal('category');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl text-xs transition border border-blue-200"
          >
            <Tag size={15} /> Quản lý loại dịch vụ
          </button>
          <button
            onClick={() => {
              resetModalStates();
              setActiveModal('service');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs transition shadow-sm"
          >
            <Plus size={15} /> Tạo mới dịch vụ
          </button>
        </div>
      </div>

      {/* ================= TOOLBAR ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm gói: mã, tên, phân loại, đối tượng, quy trình..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | ServicePackageType)}
              className="py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
            >
              <option value="all">Loại gói: tất cả</option>
              <option value="single">Dịch vụ lẻ</option>
              <option value="combo">Combo</option>
              <option value="training">Đào tạo</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none max-w-[190px]"
            >
              <option value="all">Phân loại: tất cả</option>
              {categories.map((c) => (
                <option key={c.id} value={c.title}>
                  {c.title}
                </option>
              ))}
            </select>

            <select
              value={filterAudience}
              onChange={(e) => setFilterAudience(e.target.value)}
              className="py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none max-w-[230px]"
            >
              <option value="all">Đối tượng: tất cả</option>
              {audiences.map((a) => (
                <option key={a.id} value={a.title}>
                  {a.title}
                </option>
              ))}
            </select>

            {/* Nút Toggle View Mode (Grid vs List) */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Dạng Lưới (Grid)"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Dạng Bảng (List)"
              >
                <LayoutList size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <SlidersHorizontal size={14} className="text-slate-400" />
          <span>Sort:</span>
          <button
            onClick={() => toggleSort('package_code')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            Mã gói {sortIcon('package_code')}
          </button>
          <button
            onClick={() => toggleSort('name')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            Tên gói {sortIcon('name')}
          </button>
          <button
            onClick={() => toggleSort('numeric_price')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            Giá {sortIcon('numeric_price')}
          </button>
          <button
            onClick={() => toggleSort('created_at')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            Ngày tạo {sortIcon('created_at')}
          </button>
          <span className="text-slate-300">|</span>
          <span>
            {filteredPackages.length} / {totalPackages} gói hiển thị
          </span>
        </div>
      </div>

      {/* ================= DANH SÁCH GÓI DỊCH VỤ ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Danh sách gói dịch vụ</h2>
            <p className="text-[11px] text-slate-400">
              Chi tiết đầy đủ: Mã gói, Tên, Phân loại, Đối tượng, Giá, Thời gian, Quy trình, Hợp đồng mẫu...
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Hiển thị: {viewMode === 'grid' ? 'Lưới (Grid)' : 'Bảng (List)'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <span>Đang tải danh sách gói...</span>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <PackageOpen className="text-slate-300" size={48} />
            <p className="font-semibold text-slate-700">Không tìm thấy gói dịch vụ nào</p>
            <p className="text-xs text-slate-400">
              Thay đổi bộ lọc / tìm kiếm hoặc tạo gói mới.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ================= CHẾ ĐỘ HIỂN THỊ: GRID (MẶC ĐỊNH) ================= */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPackages.map((p) => (
              <div
                key={p.id}
                className="border border-slate-200 rounded-2xl p-4 hover:shadow-md transition bg-white space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Header Thẻ: Mã gói + Loại gói + Trạng thái */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                        {p.package_code || '—'}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold ${typeBadgeClass(
                          p.package_type
                        )}`}
                      >
                        {packageTypeLabel(p.package_type)}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${statusBadgeClass(
                        p.status
                      )}`}
                    >
                      {p.status || 'Đang xây'}
                    </span>
                  </div>

                  {/* Tên gói */}
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-2 text-sm leading-snug" title={p.name}>
                      {p.name}
                    </h3>
                    {p.combo_items && p.combo_items.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
                        <BookCheck size={13} /> {p.combo_items.length} dịch vụ thành phần
                      </span>
                    )}
                  </div>

                  {/* Thông tin chi tiết */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Phân loại:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[170px] text-right" title={p.category_title || ''}>
                        {p.category_title || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Đối tượng:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[170px] text-right" title={p.target_audience || ''}>
                        {p.target_audience || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Thời gian triển khai:</span>
                      <span className="text-slate-700 font-medium flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {p.duration || '—'} ngày
                      </span>
                    </div>
                  </div>

                  {/* Giá niêm yết & Giá sau giảm */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Đơn giá niêm yết:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {displayPrice(p)}
                      </span>
                    </div>
                    {p.package_type === 'combo' && Number(p.numeric_price || 0) > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Sau giảm:</span>
                        <span className="font-bold text-emerald-600 text-xs">
                          {formatVnd(Number(p.numeric_price))}
                        </span>
                        {Number(p.discount_percent || 0) > 0 && (
                          <span className="text-[10px] text-red-500 font-semibold ml-1">
                            (-{Number(p.discount_percent)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Hành Động (Xem, Sửa, Xóa) */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setDetailsPkg(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                  >
                    <Eye size={14} className="text-slate-500" /> Chi tiết
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditPackage(p)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition"
                      title="Chỉnh sửa gói dịch vụ"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(p.id, p.name)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition"
                      title="Xóa gói dịch vụ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ================= CHẾ ĐỘ HIỂN THỊ: LIST (BẢNG TRUYỀN THỐNG) ================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
                <tr>
                  <th className="p-3 w-10 text-center">STT</th>
                  <th className="p-3">Mã gói</th>
                  <th className="p-3">Tên gói</th>
                  <th className="p-3">Loại</th>
                  <th className="p-3">Phân loại</th>
                  <th className="p-3">Đối tượng</th>
                  <th className="p-3 text-right">Giá</th>
                  <th className="p-3 text-right">Giá sau giảm</th>
                  <th className="p-3">Thời gian triển khai</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {filteredPackages.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <span className="font-mono font-semibold text-blue-700">
                        {p.package_code || '—'}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-900 max-w-[220px]">
                      <div className="truncate font-semibold">{p.name}</div>
                      {p.combo_items && p.combo_items.length > 0 && (
                        <span className="block text-[10px] text-emerald-600">
                          {p.combo_items.length} dịch vụ con
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold ${typeBadgeClass(
                          p.package_type
                        )}`}
                      >
                        {packageTypeLabel(p.package_type)}
                      </span>
                    </td>
                    <td className="p-3 max-w-[160px]">
                      <span className="truncate block" title={p.category_title || ''}>
                        {p.category_title || '—'}
                      </span>
                    </td>
                    <td className="p-3 max-w-[160px]">
                      <span className="truncate block" title={p.target_audience || ''}>
                        {p.target_audience || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {displayPrice(p)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {p.package_type === 'combo' ? (
                        <span className="inline-flex flex-col items-end">
                          <span className="font-semibold text-emerald-600">
                            {p.numeric_price ? formatVnd(Number(p.numeric_price)) : '—'}
                          </span>
                          {Number(p.discount_percent || 0) > 0 && (
                            <span className="text-[10px] text-red-500">
                              -{Number(p.discount_percent)}%
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{p.duration || '—'}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadgeClass(
                          p.status
                        )}`}
                      >
                        {p.status || 'Đang xây'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailsPkg(p)}
                          title="Xem chi tiết gói"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditPackage(p)}
                          title="Chỉnh sửa gói"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePackage(p.id, p.name)}
                          title="Xóa gói"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: XEM VÀ SAO CHÉP MÃ SQL ================= */}
      {activeModal === 'sql' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 size={18} className="text-blue-600" /> Mã SQL tạo bảng cho Supabase
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Sao chép đoạn mã SQL dưới đây, mở <strong>Supabase Dashboard &gt; SQL Editor &gt; New Query</strong>, dán vào và nhấn <strong>Run</strong>:
            </p>

            <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3 relative font-mono text-[11px]">
              <div className="overflow-y-auto max-h-[350px] pr-2">
                <pre>{SQL_SETUP_SCRIPT}</pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
              >
                {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                {copiedSql ? 'Đã sao chép!' : 'Sao chép mã SQL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUẢN LÝ ĐỐI TƯỢNG (THÊM / SỬA / XÓA + DANH SÁCH) ================= */}
      {activeModal === 'audience' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-blue-600" /> Quản Lý Đối Tượng Khách Hàng
              </h2>
              <button
                onClick={() => {
                  setActiveModal(null);
                  resetModalStates();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM NHẬP / CHỈNH SỬA */}
            <form onSubmit={handleSaveAudience} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {editingAudienceId ? '✏️ Chỉnh sửa đối tượng' : '➕ Thêm đối tượng mới'}
                </span>
                {editingAudienceId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAudienceId(null);
                      setAudTitle('');
                      setAudDescription('');
                    }}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đối tượng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Dành cho Doanh nghiệp SME"
                    value={audTitle}
                    onChange={(e) => setAudTitle(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mô tả đối tượng
                  </label>
                  <input
                    type="text"
                    placeholder="Mô tả phân khúc áp dụng..."
                    value={audDescription}
                    onChange={(e) => setAudDescription(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-sm disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : editingAudienceId ? 'Cập nhật đối tượng' : 'Lưu đối tượng'}
                </button>
              </div>
            </form>

            {/* DANH SÁCH DỮ LIỆU HIỆN CÓ */}
            <div className="flex-1 overflow-hidden flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700">
                Danh sách hiện có ({audiences.length})
              </span>
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y text-xs">
                {audiences.length === 0 ? (
                  <p className="p-4 text-center text-slate-400">Chưa có đối tượng nào</p>
                ) : (
                  audiences.map((aud) => (
                    <div key={aud.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{aud.title}</p>
                        {aud.description && (
                          <p className="text-[11px] text-slate-500 truncate">{aud.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditAudience(aud)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAudience(aud.id, aud.title)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  resetModalStates();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUẢN LÝ LOẠI DỊCH VỤ (THÊM / SỬA / XÓA + DANH SÁCH) ================= */}
      {activeModal === 'category' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag size={18} className="text-blue-600" /> Quản Lý Loại Dịch Vụ / Danh Mục
              </h2>
              <button
                onClick={() => {
                  setActiveModal(null);
                  resetModalStates();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM NHẬP / CHỈNH SỬA */}
            <form onSubmit={handleSaveCategory} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {editingCategoryId ? '✏️ Chỉnh sửa loại dịch vụ' : '➕ Thêm loại dịch vụ mới'}
                </span>
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setCatTitle('');
                      setCatDescription('');
                    }}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên loại dịch vụ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: VII - Gói Add - On"
                    value={catTitle}
                    onChange={(e) => setCatTitle(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hình thức gói
                  </label>
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value as ServicePackageType)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                  >
                    <option value="single">Dịch vụ lẻ</option>
                    <option value="combo">Combo</option>
                    <option value="training">Đào tạo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả loại dịch vụ
                </label>
                <input
                  type="text"
                  placeholder="Mô tả phạm vi nhóm giải pháp..."
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-sm disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : editingCategoryId ? 'Cập nhật loại DV' : 'Lưu loại dịch vụ'}
                </button>
              </div>
            </form>

            {/* DANH SÁCH DỮ LIỆU HIỆN CÓ */}
            <div className="flex-1 overflow-hidden flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700">
                Danh sách hiện có ({categories.length})
              </span>
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y text-xs">
                {categories.length === 0 ? (
                  <p className="p-4 text-center text-slate-400">Chưa có loại dịch vụ nào</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{cat.title}</p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${typeBadgeClass(
                              cat.package_type
                            )}`}
                          >
                            {packageTypeLabel(cat.package_type)}
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditCategory(cat)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.title)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  resetModalStates();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TẠO / SỬA GÓI DỊCH VỤ ================= */}
      {activeModal === 'service' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-4 px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-600" />
                {editingPackageId ? 'Chỉnh Sửa Gói Dịch Vụ' : 'Tạo Mới Gói Dịch Vụ'}
              </h2>
              <button
                onClick={() => {
                  setActiveModal(null);
                  resetModalStates();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã gói</label>
                  <input
                    type="text"
                    placeholder="VD: NETID-START-01"
                    value={svcCode}
                    onChange={(e) => setSvcCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên gói *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NetID Chuyển Đổi Số"
                    value={svcName}
                    onChange={(e) => setSvcName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại gói</label>
                  <select
                    value={svcType}
                    onChange={(e) => setSvcType(e.target.value as ServicePackageType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="single">Dịch vụ lẻ</option>
                    <option value="combo">Combo</option>
                    <option value="training">Đào tạo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phân loại dịch vụ
                  </label>
                  <select
                    value={svcCategory}
                    onChange={(e) => setSvcCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="">-- Chọn phân loại --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.title}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* KHU VỰC: CHỌN NHIỀU ĐỐI TƯỢNG SỬ DỤNG (MULTI-SELECT) */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Đối tượng sử dụng * (Có thể chọn nhiều đối tượng)
                    </label>
                    <span className="text-[11px] font-semibold text-blue-600">
                      Đã chọn: {selectedAudiences.length}
                    </span>
                  </div>

                  {/* Hiển thị các tag đối tượng đã chọn */}
                  {selectedAudiences.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-blue-50/60 border border-blue-200 rounded-xl">
                      {selectedAudiences.map((aud) => (
                        <span
                          key={aud}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium shadow-xs"
                        >
                          <span>{aud}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAudiences(
                                selectedAudiences.filter((item) => item !== aud)
                              )
                            }
                            className="hover:bg-blue-700 rounded-full p-0.5 transition"
                            title="Bỏ chọn"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Danh sách các đối tượng để bấm chọn / bỏ chọn nhanh */}
                  <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {audiences.map((a) => {
                      const isSelected = selectedAudiences.includes(a.title);
                      return (
                        <button
                          key={a.id || a.title}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAudiences(
                                selectedAudiences.filter((item) => item !== a.title)
                              );
                            } else {
                              setSelectedAudiences([...selectedAudiences, a.title]);
                            }
                          }}
                          className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition border ${
                            isSelected
                              ? 'bg-white border-blue-500 text-blue-700 font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border shrink-0 transition ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white font-bold'
                                : 'border-slate-300 bg-slate-50'
                            }`}
                          >
                            {isSelected && '✓'}
                          </span>
                          <span className="truncate">{a.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá (đ)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="VD: 1500000"
                    value={svcPrice}
                    onChange={(e) => setSvcPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá hiển thị (tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 1.500.000đ/năm"
                    value={svcPriceDisplay}
                    onChange={(e) => setSvcPriceDisplay(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian triển khai
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 7 - 15 ngày"
                    value={svcDuration}
                    onChange={(e) => setSvcDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hợp đồng mẫu
                  </label>
                  <input
                    type="text"
                    placeholder="Tên hoặc link hợp đồng mẫu"
                    value={svcContractTemplate}
                    onChange={(e) => setSvcContractTemplate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quy trình triển khai
                </label>
                <textarea
                  rows={2}
                  placeholder="Quy trình 5 bước..."
                  value={svcWorkflow}
                  onChange={(e) => setSvcWorkflow(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thông tin liên quan
                </label>
                <textarea
                  rows={2}
                  placeholder="Các ghi chú hoặc tài liệu đính kèm..."
                  value={svcRelatedInfo}
                  onChange={(e) => setSvcRelatedInfo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              {/* TRƯỜNG TRẠNG THÁI */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Đang xây', color: 'border-blue-300 text-blue-700 bg-blue-50/50' },
                    { val: 'Đang chỉnh sửa', color: 'border-amber-300 text-amber-700 bg-amber-50/50' },
                    { val: 'Đã hoàn chỉnh', color: 'border-emerald-300 text-emerald-700 bg-emerald-50/50' },
                  ].map((st) => (
                    <label
                      key={st.val}
                      className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        svcStatus === st.val
                          ? `${st.color} border-2 shadow-xs`
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="svcStatus"
                        value={st.val}
                        checked={svcStatus === st.val}
                        onChange={(e) => setSvcStatus(e.target.value)}
                        className="sr-only"
                      />
                      <span>{st.val}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 sticky bottom-0 bg-white py-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    resetModalStates();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium disabled:opacity-60 transition shadow-sm"
                >
                  {saving ? 'Đang lưu...' : editingPackageId ? 'Cập nhật dịch vụ' : 'Lưu dịch vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHI TIẾT GÓI ================= */}
      {detailsPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full">
                  {detailsPkg.package_code || '—'}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{detailsPkg.name}</h2>
              </div>
              <button
                onClick={() => setDetailsPkg(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium">Loại gói</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {packageTypeLabel(detailsPkg.package_type)}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium">Phân loại</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {detailsPkg.category_title || '—'}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium">Đối tượng</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {detailsPkg.target_audience || '—'}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium">Giá</p>
                <p className="font-semibold text-emerald-700 mt-0.5">{displayPrice(detailsPkg)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium">Giá sau giảm</p>
                <p className="font-semibold text-emerald-700 mt-0.5">
                  {detailsPkg.numeric_price ? formatVnd(Number(detailsPkg.numeric_price)) : '—'}
                  {Number(detailsPkg.discount_percent || 0) > 0 && (
                    <span className="text-red-500"> (-{Number(detailsPkg.discount_percent)}%)</span>
                  )}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium">Thời gian triển khai</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailsPkg.duration || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium">Trạng thái</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailsPkg.status || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl col-span-2">
                <p className="text-[10px] text-slate-400 font-medium">Ngày tạo</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {detailsPkg.created_at
                    ? new Date(detailsPkg.created_at).toLocaleString('vi-VN')
                    : '—'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-700">Quy trình triển khai</p>
              <p className="text-xs text-slate-600 whitespace-pre-line">
                {detailsPkg.workflow || 'Chưa có'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-700">Hợp đồng mẫu</p>
              <p className="text-xs text-slate-600 break-all">
                {detailsPkg.contract_template || 'Chưa có'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-700">Thông tin liên quan</p>
              <p className="text-xs text-slate-600 whitespace-pre-line">
                {detailsPkg.related_info || 'Chưa có'}
              </p>
            </div>

            {detailsPkg.combo_items && detailsPkg.combo_items.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <p className="px-3 py-2 bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <BookCheck size={13} className="text-emerald-600" />
                  Dịch vụ con trong gói ({detailsPkg.combo_items.length})
                </p>
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-2">Dịch vụ</th>
                      <th className="p-2 text-right">Đơn giá</th>
                      <th className="p-2 text-right">Số lượng</th>
                      <th className="p-2 text-right">Tổng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {detailsPkg.combo_items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 font-medium">{item.service_name || '—'}</td>
                        <td className="p-2 text-right">{formatVnd(Number(item.unit_price))}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right font-semibold">
                          {formatVnd(Number(item.total_price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailsPkg(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}