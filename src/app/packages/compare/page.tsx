'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GitCompare, RefreshCw, X, Layers } from 'lucide-react';
import { getServicePackages, packageTypeLabel, formatVnd } from '@/lib/packages';
import type { ServicePackage } from '@/types/database';

const COMPARE_ATTRIBUTES: Array<{
  key: string;
  label: string;
  render: (pkg: ServicePackage) => React.ReactNode;
}> = [
  {
    key: 'package_code',
    label: 'Mã gói',
    render: (pkg) => pkg.package_code || '—',
  },
  {
    key: 'package_type',
    label: 'Loại gói',
    render: (pkg) => packageTypeLabel(pkg.package_type),
  },
  {
    key: 'category_title',
    label: 'Phân loại',
    render: (pkg) => pkg.category_title || '—',
  },
  {
    key: 'target_audience',
    label: 'Đối tượng',
    render: (pkg) => pkg.target_audience || '—',
  },
  {
    key: 'price',
    label: 'Giá',
    render: (pkg) =>
      pkg.numeric_price ? formatVnd(pkg.numeric_price) : pkg.price || '—',
  },
  {
    key: 'discount_percent',
    label: '% Giảm',
    render: (pkg) =>
      pkg.discount_percent ? `${pkg.discount_percent}%` : '—',
  },
  {
    key: 'duration',
    label: 'Thời gian triển khai',
    render: (pkg) => pkg.duration || '—',
  },
  {
    key: 'workflow',
    label: 'Quy trình triển khai',
    render: (pkg) => pkg.workflow || '—',
  },
  {
    key: 'contract_template',
    label: 'Hợp đồng mẫu',
    render: (pkg) => pkg.contract_template || '—',
  },
  {
    key: 'combo_count',
    label: 'Số dịch vụ con',
    render: (pkg) =>
      pkg.combo_items && pkg.combo_items.length > 0
        ? `${pkg.combo_items.length} dịch vụ`
        : '—',
  },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (pkg) => pkg.status || '—',
  },
  {
    key: 'created_at',
    label: 'Ngày tạo',
    render: (pkg) =>
      pkg.created_at
        ? new Date(pkg.created_at).toLocaleDateString('vi-VN')
        : '—',
  },
];

export default function ComparePackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getServicePackages();
      setPackages(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách gói. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu gói một lần khi mở trang
    fetchPackages();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 4
          ? prev
          : [...prev, id]
    );
  };

  const selectedPackages = useMemo(
    () =>
      selectedIds
        .map((id) => packages.find((p) => p.id === id))
        .filter((p): p is ServicePackage => Boolean(p)),
    [selectedIds, packages]
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitCompare size={24} className="text-emerald-600" />
            So sánh gói
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chọn tối đa 4 gói dịch vụ để so sánh song song các thông số chi tiết
          </p>
        </div>
        <button
          onClick={fetchPackages}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Khu vực chọn gói để so sánh */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <h3 className="text-xs font-bold text-slate-900 border-b pb-2 mb-3">
          Chọn gói cần so sánh ({selectedIds.length}/4)
        </h3>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-8">
            <Layers size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">
              Chưa có gói dịch vụ nào. Hãy tạo gói đầu tiên.
            </p>
            <Link
              href="/packages/new"
              className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
            >
              Tạo gói mới
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {packages.map((pkg) => {
              const isSelected = selectedIds.includes(pkg.id);
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => toggleSelect(pkg.id)}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 truncate">
                      {pkg.name}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {pkg.package_code || '—'} · {packageTypeLabel(pkg.package_type)}
                    </span>
                  </span>
                  <span
                    className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {isSelected && (
                      <X size={10} className="text-white rotate-45" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bảng so sánh chi tiết */}
      {selectedPackages.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide w-44">
                    Thông số
                  </th>
                  {selectedPackages.map((pkg) => (
                    <th
                      key={pkg.id}
                      className="text-left px-4 py-3 font-bold text-slate-900 min-w-52 align-top"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span>{pkg.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleSelect(pkg.id)}
                          title="Bỏ chọn"
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ATTRIBUTES.map((attr, idx) => (
                  <tr
                    key={attr.key}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-600 align-top">
                      {attr.label}
                    </td>
                    {selectedPackages.map((pkg) => (
                      <td
                        key={pkg.id}
                        className="px-4 py-3 text-slate-800 align-top whitespace-pre-line"
                      >
                        {attr.render(pkg)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPackages.length === 0 && !loading && packages.length > 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <GitCompare size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">
            Hãy chọn ít nhất 2 gói ở phía trên để bắt đầu so sánh.
          </p>
        </div>
      )}
    </div>
  );
}
