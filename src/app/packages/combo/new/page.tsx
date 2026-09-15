'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, ArrowLeft, Layers, Calculator } from 'lucide-react';
import Link from 'next/link';
import type { ServicePackage, ServiceTargetAudience } from '@/types/database';

interface ComboItem {
  id: string;
  code?: string;
  name: string;
  unit_price: number;
  quantity: number;
}

export default function NewComboPackagePage() {
  const router = useRouter();
  const [allServices, setAllServices] = useState<ServicePackage[]>([]);
  const [audiences, setAudiences] = useState<ServiceTargetAudience[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Fields Gói Combo
  const [packageCode, setPackageCode] = useState('');
  const [name, setName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [duration, setDuration] = useState('');
  const [contractTemplate, setContractTemplate] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [relatedInfo, setRelatedInfo] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [customPrice, setCustomPrice] = useState<string>('');

  // Dịch vụ đã thêm vào Combo
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);

  const fetchInitialData = async () => {
    const { data: svcs } = await supabase
      .from('service_packages')
      .select('*')
      .eq('package_type', 'single');
    const { data: auds } = await supabase
      .from('service_target_audiences')
      .select('*');
    if (svcs) setAllServices(svcs as ServicePackage[]);
    if (auds) setAudiences(auds as ServiceTargetAudience[]);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu danh mục một lần khi mở trang
    fetchInitialData();
  }, []);

  // Thêm dịch vụ vào Combo
  const handleAddService = (svc: ServicePackage) => {
    const exists = comboItems.find(item => item.id === svc.id);
    if (exists) {
      alert('Dịch vụ này đã có trong combo!');
      return;
    }
    // Trích xuất giá số tương đối nếu có
    const numPrice = parseFloat(String(svc.price).replace(/[^0-9.]/g, '')) || 0;
    setComboItems([
      ...comboItems,
      {
        id: svc.id,
        code: svc.package_code,
        name: svc.name,
        unit_price: numPrice > 0 ? numPrice : 500000,
        quantity: 1,
      }
    ]);
  };

  // Xóa dịch vụ khỏi Combo
  const handleRemoveService = (index: number) => {
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  // Thay đổi giá hoặc số lượng của từng dịch vụ con
  const handleItemChange = (index: number, field: 'quantity' | 'unit_price', val: number) => {
    const updated = [...comboItems];
    updated[index][field] = val;
    setComboItems(updated);
  };

  // Tính tổng tiền gốc
  const rawTotal = comboItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  // Tính tổng tiền sau giảm giá
  const calculatedPrice = rawTotal * (1 - discountPercent / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập Tên gói Combo!');
      return;
    }

    try {
      const finalPriceDisplay = customPrice.trim() || `${calculatedPrice.toLocaleString('vi-VN')} đ`;
      // 1. Lưu Gói Combo vào bảng service_packages
      const { data: newCombo, error: comboErr } = await supabase
        .from('service_packages')
        .insert([{
          package_code: packageCode.trim() || 'COMBO-CUSTOM',
          name: name.trim(),
          package_type: 'combo',
          category_title: 'COMBO CUSTOM',
          target_audience: targetAudience,
          price: finalPriceDisplay,
          numeric_price: calculatedPrice,
          discount_percent: discountPercent,
          duration: duration.trim(),
          contract_template: contractTemplate.trim(),
          workflow: workflow.trim(),
          related_info: relatedInfo.trim(),
          status: 'Đang triển khai'
        }])
        .select()
        .single();

      if (comboErr) throw comboErr;

      // 2. Lưu các dịch vụ con vào bảng combo_package_items
      if (comboItems.length > 0) {
        const itemRows = comboItems.map(item => ({
          combo_package_id: newCombo.id,
          service_package_id: item.id,
          service_code: item.code,
          service_name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        }));
        await supabase.from('combo_package_items').insert(itemRows);
      }

      alert('Đã tạo Gói Combo / Custom thành công!');
      router.push('/packages');
    } catch (err) {
      alert(
        'Lỗi: ' +
          (err instanceof Error
            ? err.message
            : 'Đã xảy ra lỗi không xác định khi lưu gói combo.')
      );
    }
  };

  const filteredServices = allServices.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.package_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pb-16">
      <Link href="/packages" className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600">
        <ArrowLeft size={16} /> Quay lại Tổng quan gói SP/DV
      </Link>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <Layers size={26} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tạo Gói Combo / Dịch Vụ Custom</h1>
          <p className="text-xs text-slate-500">Tùy biến gói combo bằng cách kết hợp nhiều dịch vụ lẻ, chỉnh sửa số lượng & giá</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: THÔNG TIN CHÍNH CỦA GÓI */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-2">1. Thông Tin Gói Combo</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">MÃ GÓI</label>
              <input type="text" placeholder="VD: COMBO-VIP-01" value={packageCode} onChange={e => setPackageCode(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-mono outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">TÊN GÓI *</label>
              <input type="text" required placeholder="VD: Combo Chuyển Đổi Số Toàn Diện" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CHỌN ĐỐI TƯỢNG</label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
              >
                <option value="">— Chọn đối tượng —</option>
                {audiences.map(a => (
                  <option key={a.id} value={a.title}>{a.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">THỜI GIAN TRIỂN KHAI</label>
              <input type="text" placeholder="VD: 15 - 30 ngày" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HỢP ĐỒNG MẪU</label>
              <input type="text" placeholder="Tên hoặc link hợp đồng mẫu" value={contractTemplate} onChange={e => setContractTemplate(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">QUY TRÌNH TRIỂN KHAI</label>
              <input type="text" placeholder="Quy trình 5 bước..." value={workflow} onChange={e => setWorkflow(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">THÔNG TIN LIÊN QUAN</label>
            <textarea rows={2} placeholder="Các ghi chú hoặc tài liệu đính kèm..." value={relatedInfo} onChange={e => setRelatedInfo(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none" />
          </div>

          {/* KHU VỰC CÁC DỊCH VỤ ĐÃ CHỌN VÀO COMBO */}
          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900">Dịch Vụ Đã Thêm Vào Combo ({comboItems.length})</h3>
              <span className="text-xs text-slate-400">Có thể chỉnh sửa Đơn giá và Số lượng trực tiếp</span>
            </div>

            {comboItems.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed rounded-xl text-xs text-slate-400">
                Chưa có dịch vụ nào trong gói. Hãy chọn từ danh sách bên phải!
              </div>
            ) : (
              <div className="divide-y border rounded-xl overflow-hidden text-xs">
                {comboItems.map((item, idx) => (
                  <div key={item.id} className="p-3 bg-white flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="font-mono text-[11px] text-blue-600">{item.code || 'DV-LE'}</p>
                    </div>

                    {/* EDIT SỐ LƯỢNG */}
                    <div className="w-20">
                      <label className="text-[10px] text-slate-400 block">Số lượng</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full p-1 bg-slate-50 border rounded-lg text-center font-bold"
                      />
                    </div>

                    {/* EDIT ĐƠN GIÁ */}
                    <div className="w-28">
                      <label className="text-[10px] text-slate-400 block">Đơn giá (đ)</label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                        className="w-full p-1 bg-slate-50 border rounded-lg text-right font-bold text-emerald-600"
                      />
                    </div>

                    <button type="button" onClick={() => handleRemoveService(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: KHUNG TÌM KIẾM DỊCH VỤ VÀ TÍNH TIỀN */}
        <div className="space-y-4">
          {/* TÍNH TOÁN GIÁ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b pb-2">
              <Calculator size={16} className="text-emerald-600" /> Tổng Giá Trị & % Giảm
            </h3>

            <div className="flex justify-between text-xs text-slate-600">
              <span>Tổng gốc:</span>
              <span className="font-bold">{rawTotal.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-700">% GIẢM:</label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={e => setDiscountPercent(Number(e.target.value))}
                className="w-20 p-1.5 bg-slate-50 border rounded-lg text-center font-bold text-red-600 text-xs"
              />
            </div>

            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900">GIÁ SAU GIẢM:</span>
              <span className="text-base font-bold text-emerald-600">{calculatedPrice.toLocaleString('vi-VN')} đ</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Ghi đè giá hiển thị (Tùy chọn):</label>
              <input
                type="text"
                placeholder="VD: 20.750.000đ/năm"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                className="w-full p-2 bg-slate-50 border rounded-lg text-xs"
              />
            </div>

            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm">
              Lưu Gói Combo Này
            </button>
          </div>

          {/* CHỌN DỊCH VỤ ĐỂ THÊM */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900">Thêm Dịch Vụ Vào Gói</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm dịch vụ lẻ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border rounded-xl text-xs outline-none"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 divide-y">
              {filteredServices.slice(0, 15).map(s => (
                <div key={s.id} className="pt-1.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.price || 'Liên hệ'}</p>
                  </div>
                  <button type="button" onClick={() => handleAddService(s)} className="px-2 py-1 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 flex items-center gap-1 shrink-0">
                    <Plus size={13} /> Thêm
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}