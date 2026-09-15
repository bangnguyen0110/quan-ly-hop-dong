'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, PackagePlus, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createServicePackage } from '@/lib/packages';
import type { ServiceCategory, ServiceTargetAudience } from '@/types/database';

type PackageType = 'single' | 'training';

export default function NewPackagePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [audiences, setAudiences] = useState<ServiceTargetAudience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [packageCode, setPackageCode] = useState('');
  const [name, setName] = useState('');
  const [packageType, setPackageType] = useState<PackageType>('single');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [price, setPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [duration, setDuration] = useState('');
  const [contractTemplate, setContractTemplate] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [relatedInfo, setRelatedInfo] = useState('');
  const [status, setStatus] = useState('Đang triển khai');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: cats }, { data: auds }] = await Promise.all([
          supabase
            .from('service_categories')
            .select('*')
            .in('package_type', ['single', 'training'])
            .order('title', { ascending: true }),
          supabase
            .from('service_target_audiences')
            .select('*')
            .order('title', { ascending: true }),
        ]);
        if (cats) setCategories(cats as ServiceCategory[]);
        if (auds) setAudiences(auds as ServiceTargetAudience[]);
      } catch {
        setError('Không thể tải danh mục. Vui lòng thử lại.');
      }
    };
    fetchData();
  }, []);

  // Giá số dùng cho thống kê (loại bỏ ký tự không phải số)
  const numericPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
  const priceAfterDiscount =
    numericPrice * (1 - (Number(discountPercent) || 0) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Vui lòng nhập Tên gói!');
      return;
    }
    if (!packageCode.trim()) {
      setError('Vui lòng nhập Mã gói!');
      return;
    }

    setLoading(true);
    try {
      await createServicePackage({
        package_code: packageCode.trim(),
        name: name.trim(),
        package_type: packageType,
        category_title: categoryTitle || null,
        target_audience: targetAudience || null,
        price: price.trim() || null,
        numeric_price: numericPrice,
        discount_percent: Number(discountPercent) || 0,
        duration: duration.trim() || null,
        contract_template: contractTemplate.trim() || null,
        workflow: workflow.trim() || null,
        related_info: relatedInfo.trim() || null,
        status,
      });
      router.push('/packages');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi lưu gói. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition';

  const labelClass =
    'block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5';

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/packages"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-2"
        >
          <ArrowLeft size={14} /> Quay lại Tổng quan
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PackagePlus size={24} className="text-blue-600" />
          Tạo gói mới
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Khai báo gói dịch vụ lẻ hoặc gói đào tạo lưu vào bảng{' '}
          <code className="bg-slate-100 px-1 rounded">service_packages</code>
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5">
        {/* Cột trái: Thông tin chính */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 border-b pb-2">
            Thông tin gói
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Mã gói *</label>
              <input
                type="text"
                placeholder="VD: DV-001"
                value={packageCode}
                onChange={(e) => setPackageCode(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Loại gói</label>
              <select
                value={packageType}
                onChange={(e) => setPackageType(e.target.value as PackageType)}
                className={inputClass}
              >
                <option value="single">Dịch vụ lẻ</option>
                <option value="training">Đào tạo</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Tên gói *</label>
            <input
              type="text"
              placeholder="VD: Thiết kế Website chuẩn SEO"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Phân loại</label>
              <select
                value={categoryTitle}
                onChange={(e) => setCategoryTitle(e.target.value)}
                className={inputClass}
              >
                <option value="">— Chọn phân loại —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.title}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Đối tượng</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className={inputClass}
              >
                <option value="">— Chọn đối tượng —</option>
                {audiences.map((a) => (
                  <option key={a.id} value={a.title}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Giá hiển thị</label>
            <input
              type="text"
              placeholder="VD: 20.750.000đ/năm"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
            />
            {numericPrice > 0 && (
              <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
                Giá sau giảm: {priceAfterDiscount.toLocaleString('vi-VN')} đ
              </p>
            )}
          </div>
        </div>
        {/* Cột phải: Giá, quy trình & thông tin liên quan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 border-b pb-2">
            Giá, Quy trình &amp; Thông tin liên quan
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>% Giảm</label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Thời gian triển khai</label>
              <input
                type="text"
                placeholder="VD: 14 ngày"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              <option value="Đang triển khai">Đang triển khai</option>
              <option value="Ngừng nhận">Ngừng nhận</option>
              <option value="Tạm dừng">Tạm dừng</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Hợp đồng mẫu</label>
            <input
              type="text"
              placeholder="VD: HĐDV-2024/WEB"
              value={contractTemplate}
              onChange={(e) => setContractTemplate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Quy trình triển khai</label>
            <textarea
              rows={4}
              placeholder="VD: 1. Tiếp nhận yêu cầu → 2. Khảo sát → 3. Ký hợp đồng → 4. Triển khai → 5. Bàn giao"
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label className={labelClass}>Thông tin liên quan</label>
            <textarea
              rows={4}
              placeholder="Ghi chú thêm về gói dịch vụ, điều kiện áp dụng, bonus kèm theo..."
              value={relatedInfo}
              onChange={(e) => setRelatedInfo(e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save size={14} /> Lưu gói dịch vụ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
