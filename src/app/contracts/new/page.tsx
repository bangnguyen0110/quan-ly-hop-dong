'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContractTemplate, Category } from '@/types/database';
import { getCategories, createContract, uploadContractFile } from '@/lib/contracts';
import { getTemplates, markTemplateUsed } from '@/lib/templates';
import { FileText, ArrowLeft, Loader2, Save, CheckCircle2, FolderOpen, FileText as ContractIcon } from 'lucide-react';

export default function NewContractPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // State cho popup thông báo thành công
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdContractFolderId, setCreatedContractFolderId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [contractCode, setContractCode] = useState('');
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('CÔNG TY CỔ PHẦN HIỀN NHÂN GROUP');
  const [value, setValue] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [customDays, setCustomDays] = useState('1, 7');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [folderId, setFolderId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [cats, tmpls] = await Promise.all([getCategories(), getTemplates()]);
        setCategories(cats);
        setTemplates(tmpls);
      } catch (err) {
        console.error('Lỗi nạp dữ liệu:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId) || null;

  const handleTemplateChange = (eid: string) => {
    setTemplateId(eid);
    const tpl = templates.find((t) => t.id === eid);
    if (!tpl) {
      setCustomFields({});
      setFolderId('');
      return;
    }
    const initial: Record<string, string> = {};
    tpl.field_definitions?.forEach((f) => {
      initial[f.key] = '';
    });
    setCustomFields(initial);
    // Tự động lấy Folder ID từ template nếu có
    if (tpl.google_folder_id) {
      setFolderId(tpl.google_folder_id);
    } else {
      setFolderId('');
    }
  };

  const setCustomFieldValue = (key: string, val: string) => {
    setCustomFields((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !endDate) {
      alert('Vui lòng nhập Tên hợp đồng và Ngày hết hạn.');
      return;
    }
    try {
      setUploading(true);
      let fileUrl = '';
      if (file) {
        fileUrl = await uploadContractFile(file);
      }
      const notifyDaysArray = customDays
        .split(',')
        .map((d) => parseInt(d.trim()))
        .filter((d) => !isNaN(d));
      const payload = {
        title: title.trim(),
        contract_code: contractCode.trim() || undefined,
        party_a: partyA.trim() || undefined,
        party_b: partyB.trim() || undefined,
        value: Number(value) || 0,
        end_date: endDate,
        file_url: fileUrl || undefined,
        status: 'active',
        custom_notify_days: notifyDaysArray.length > 0 ? notifyDaysArray : [1, 7],
        category_id: categoryId || undefined,
        template_id: templateId || undefined,
        folder_id: folderId || undefined,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
      };
      const contractResult = await createContract(payload);
      const newContractId = contractResult?.[0]?.id || null;

      // Lưu thông tin folder từ template để hiển thị trong modal
      const selectedTpl = templates.find((t) => t.id === templateId);
      setCreatedContractFolderId(selectedTpl?.google_folder_id || null);

      // Cập nhật thời gian dùng gần nhất cho mẫu hợp đồng đã chọn
      if (templateId) {
        try {
          await markTemplateUsed(templateId);
        } catch (e) {
          console.error('Không cập nhật được last_used_at:', e);
        }
      }

      // Gọi API generate để xuất file Google Doc/PDF
      if (newContractId) {
        try {
          await fetch('/api/contracts/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contract_id: newContractId,
            }),
          });
        } catch (generateError) {
          console.error('Lỗi khi gọi API generate:', generateError);
          // Không block luồng chính nếu generate thất bại
        }
      }

      // Hiển thị popup thông báo thành công
      setShowSuccessModal(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      alert('Lỗi khi lưu hợp đồng: ' + message);
    } finally {
      setUploading(false);
    }
  };

  const inputCls =
    'w-full border border-slate-300 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white';

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600" /> Thêm Hợp Đồng Mới
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Điền thông tin, chọn mẫu Google Doc và nhập dữ liệu tùy chỉnh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl text-sm font-medium transition"
        >
          <ArrowLeft size={18} /> Quay lại
        </button>
      </div>


      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Thông Tin Cơ Bản</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Hợp Đồng <span className="text-red-500">*</span></label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Hợp đồng Dịch vụ" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Loại Hợp Đồng</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                    <option value="">-- Chọn loại --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mã Hợp Đồng</label>
                  <input type="text" value={contractCode} onChange={(e) => setContractCode(e.target.value)} placeholder="HD-2025-001" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Bên A (Đối Tác / Khách Hàng) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={partyA}
                    onChange={(e) => setPartyA(e.target.value)}
                    placeholder="Nhập tên công ty / cá nhân đối tác"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Bên B (CÔNG TY CỔ PHẦN HIỀN NHÂN GROUP)
                  </label>
                  <input
                    type="text"
                    value={partyB}
                    onChange={(e) => setPartyB(e.target.value)}
                    placeholder="CÔNG TY CỔ PHẦN HIỀN NHÂN GROUP"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Giá trị (VNĐ)</label>
                  <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày Hết Hạn <span className="text-red-500">*</span></label>
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          </div>


          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" /> Mẫu Hợp Đồng & Trường Tùy Chỉnh
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chọn Mẫu Hợp Đồng (Google Doc)</label>
                <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} className={inputCls}>
                  <option value="">-- Không chọn mẫu --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Folder ID (Google Drive) <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  placeholder="Tự động lấy từ template hoặc nhập thủ công"
                  className={inputCls + ' font-mono text-xs'}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {folderId ? (
                    <span className="text-emerald-600">✓ Đã có Folder ID từ template</span>
                  ) : (
                    'Nhập Folder ID để lưu thông tin thư mục Google Drive'
                  )}
                </p>
              </div>
              {selectedTemplate && selectedTemplate.field_definitions?.length > 0 ? (
                <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                  <p className="text-xs font-semibold text-slate-700">Nhập dữ liệu cho: {selectedTemplate.name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedTemplate.field_definitions.map((f) => {
                      const val = customFields[f.key] !== undefined ? customFields[f.key] : '';
                      return (
                        <div key={f.key}>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            {f.label} <span className="text-slate-300 font-mono">({`{{${f.key}}}`})</span>
                          </label>
                          {f.type === 'date' ? (
                            <input type="date" value={val} onChange={(e) => setCustomFieldValue(f.key, e.target.value)} className={inputCls} />
                          ) : f.type === 'number' ? (
                            <input type="number" value={val} onChange={(e) => setCustomFieldValue(f.key, e.target.value)} className={inputCls} />
                          ) : (
                            <input type="text" value={val} onChange={(e) => setCustomFieldValue(f.key, e.target.value)} placeholder={f.label} className={inputCls} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedTemplate ? (
                <p className="text-xs text-slate-400 italic">Mẫu này không có trường dữ liệu tùy chỉnh.</p>
              ) : (
                <p className="text-xs text-slate-400 italic">Chọn một mẫu hợp đồng để nhập dữ liệu động (custom fields).</p>
              )}
            </div>
          </div>


          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mốc báo trước Telegram (số ngày, cách nhau bằng dấu phẩy)
              </label>
              <input type="text" placeholder="Ví dụ: 1, 7, 15, 30" value={customDays} onChange={(e) => setCustomDays(e.target.value)} className={inputCls + ' font-mono'} />
              <p className="text-[11px] text-slate-400 mt-1">Mặc định: 1, 7</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">File Hợp Đồng (Tùy chọn)</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={16} /> Hủy / Quay lại
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition disabled:opacity-60"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {uploading ? 'Đang lưu...' : 'Lưu Hợp Đồng'}
            </button>
          </div>
        </form>
      )}
      
      {/* POPUP THÔNG BÁO TẠO HỢP ĐỒNG THÀNH CÔNG */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-w-md w-full space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">🎉 Tạo Hợp Đồng Thành Công!</h2>
              <p className="text-sm text-slate-500">
                Hợp đồng đã được tạo và lưu thành công vào hệ thống.
              </p>
            </div>

            {/* Hiển thị thông tin Folder ID nếu có */}
            {(createdContractFolderId || folderId) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                  <FolderOpen size={14} />
                  Thông tin thư mục Google Drive
                </p>
                <div className="space-y-1.5">
                  {createdContractFolderId && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-blue-700">Folder ID (từ template):</span>
                      <code className="text-[11px] bg-white px-2 py-1 rounded border border-blue-200 text-blue-900 font-mono">
                        {createdContractFolderId}
                      </code>
                    </div>
                  )}
                  {folderId && folderId !== createdContractFolderId && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-blue-700">Folder ID (thủ công):</span>
                      <code className="text-[11px] bg-white px-2 py-1 rounded border border-blue-200 text-blue-900 font-mono">
                        {folderId}
                      </code>
                    </div>
                  )}
                </div>
                <a
                  href={'https://drive.google.com/drive/folders/' + (createdContractFolderId || folderId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                >
                  <FolderOpen size={13} />
                  Mở thư mục trên Google Drive
                </a>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {/* Nút 1: Đóng */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  // Reset form
                  setTitle('');
                  setContractCode('');
                  setPartyA('');
                  setPartyB('');
                  setValue(0);
                  setEndDate('');
                  setCustomDays('1, 7');
                  setCategoryId('');
                  setFile(null);
                  setTemplateId('');
                  setCustomFields({});
                  setFolderId('');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Đóng
              </button>

              {/* Nút 2: Mở folder */}
              <button
                onClick={() => {
                  if (!createdContractFolderId) {
                    alert('Mẫu hợp đồng này chưa được cấu hình Google Drive Folder ID.');
                    return;
                  }
                  window.open('https://drive.google.com/drive/folders/' + createdContractFolderId, '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
              >
                <FolderOpen size={18} />
                Mở folder
              </button>

              {/* Nút 3: Đến Hợp Đồng */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
              >
                <ContractIcon size={18} />
                Đến Hợp Đồng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

