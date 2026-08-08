'use client';

import { useEffect, useState } from 'react';
import { ContractTemplate, FieldDefinition } from '@/types/database';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/templates';
import { FileCode, Plus, Trash2, Tag, ArrowLeft, Search, Edit3, X, Clock } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // State cho Form (Tạo mới & Chỉnh sửa)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [googleDocId, setGoogleDocId] = useState('');
  const [googleFolderId, setGoogleFolderId] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [fields, setFields] = useState<FieldDefinition[]>([]);

  // State thêm Trường Tùy Chỉnh
  const [fieldKey, setFieldKey] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date'>('text');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Mở chế độ Chỉnh sửa mẫu
  const handleEditClick = (tpl: ContractTemplate) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setGoogleDocId(tpl.google_doc_id);
    setGoogleFolderId(tpl.google_folder_id || '');
    setAppsScriptUrl(tpl.apps_script_url || '');
    setFields(tpl.field_definitions || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hủy chỉnh sửa (Reset Form)
  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setGoogleDocId('');
    setGoogleFolderId('');
    setAppsScriptUrl('');
    setFields([]);
  };

  // Thêm Custom Field
  const handleAddField = () => {
    if (!fieldKey.trim() || !fieldLabel.trim()) {
      alert('Vui lòng nhập Mã biến và Nhãn hiển thị!');
      return;
    }
    const cleanKey = fieldKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (fields.some((f) => f.key === cleanKey)) {
      alert('Mã biến này đã tồn tại!');
      return;
    }
    setFields([...fields, { key: cleanKey, label: fieldLabel, type: fieldType }]);
    setFieldKey('');
    setFieldLabel('');
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // Lưu Form (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Cập nhật mẫu hiện tại
        await updateTemplate(editingId, {
          name,
          google_doc_id: googleDocId.trim(),
          google_folder_id: googleFolderId.trim() || undefined,
          apps_script_url: appsScriptUrl.trim(),
          field_definitions: fields,
        });
        alert('Cập nhật mẫu hợp đồng thành công!');
      } else {
        // Tạo mẫu mới
        await createTemplate({
          name,
          google_doc_id: googleDocId.trim(),
          google_folder_id: googleFolderId.trim() || undefined,
          apps_script_url: appsScriptUrl.trim(),
          field_definitions: fields,
        });
        alert('Tạo mẫu hợp đồng mới thành công!');
      }

      handleCancelEdit();
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không xác định';
      alert('Lỗi: ' + message);
    }
  };

  // Lọc mẫu theo Từ khóa tìm kiếm (bọc an toàn cho các trường có thể null từ CSDL)
  const filteredTemplates = templates.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchName = (t.name || '').toLowerCase().includes(term);
    const matchDocId = (t.google_doc_id || '').toLowerCase().includes(term);
    const matchFields = t.field_definitions?.some(
      (f) => (f.key || '').toLowerCase().includes(term) || (f.label || '').toLowerCase().includes(term)
    );
    return matchName || matchDocId || matchFields;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-12 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
          <ArrowLeft size={16} /> Quay lại Danh sách Hợp đồng
        </Link>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileCode size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Quản Lý Mẫu Hợp Đồng</h1>
            <p className="text-[10px] sm:text-xs text-slate-500">Thiết lập & chỉnh sửa mẫu Google Docs, Custom Fields</p>
          </div>
        </div>
      </div>

      {/* FORM TẠO / SỬA MẪU HỢP ĐỒNG */}
      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
          <h2 className="text-base font-bold text-slate-800">
            {editingId ? '✏️ Chỉnh Sửa Mẫu Hợp Đồng' : '➕ Thêm Mẫu Hợp Đồng Mới'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-red-600 hover:underline flex items-center gap-1 font-medium"
            >
              <X size={14} /> Hủy chỉnh sửa
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Mẫu Hợp Đồng *</label>
            <input
              type="text"
              required
              placeholder="VD: Hợp đồng Thuê nhà 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Google Doc Template ID *</label>
            <input
              type="text"
              required
              placeholder="ID từ link Google Doc (VD: 1a2b3c4d5e...)"
              value={googleDocId}
              onChange={(e) => setGoogleDocId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Google Drive Folder ID</label>
            <input
              type="text"
              placeholder="ID từ link Google Drive Folder (Tùy chọn)"
              value={googleFolderId}
              onChange={(e) => setGoogleFolderId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">URL Google Apps Script Webhook *</label>
            <input
              type="url"
              required
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* CẤU HÌNH TRƯỜNG TÙY CHỈNH */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Tag size={16} className="text-blue-600" /> Thêm Trường Dữ Liệu Tùy Chỉnh (Custom Fields)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Mã biến (VD: tax_code)"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              className="p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none font-mono"
            />
            <input
              type="text"
              placeholder="Tên nhãn (VD: Mã số thuế)"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              className="p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
            />
            <select
              value={fieldType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFieldType(e.target.value as 'text' | 'number' | 'date')}
              className="p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
            >
              <option value="text">Chữ (Text)</option>
              <option value="number">Số (Number)</option>
              <option value="date">Ngày (Date)</option>
            </select>
            <button
              type="button"
              onClick={handleAddField}
              className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-blue-700 flex items-center justify-center gap-1"
            >
              <Plus size={14} /> Thêm trường
            </button>
          </div>

          {fields.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
              {fields.map((f, idx) => (
                <span key={idx} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600">{`{{${f.key}}}`}</span>
                  <span className="text-slate-500">({f.label})</span>
                  <button type="button" onClick={() => handleRemoveField(idx)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-xs transition shadow-sm"
          >
            {editingId ? 'Cập Nhật Mẫu Hợp Đồng' : 'Lưu Mẫu Hợp Đồng'}
          </button>
        </div>
      </form>

      {/* TÌM KIẾM VÀ DANH SÁCH CÓ ĐÁNH STT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Danh Sách Mẫu Hợp Đồng</h2>
            <p className="text-xs text-slate-400">Các mẫu dùng gần đây nhất được tự động đẩy lên phía trên</p>
          </div>

          {/* Ô TÌM KIẾM */}
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên mẫu, mã biến..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* BẢNG HIỂN THỊ CÓ STT */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
              <tr>
                <th className="p-3 w-12 text-center">STT</th>
                <th className="p-3">Tên Mẫu</th>
                <th className="p-3">Google Doc ID</th>
                <th className="p-3">Folder ID</th>
                <th className="p-3">Các Trường Tùy Chỉnh</th>
                <th className="p-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center text-slate-400">Đang tải...</td></tr>
              ) : filteredTemplates.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-slate-400">Không tìm thấy mẫu hợp đồng nào.</td></tr>
              ) : (
                filteredTemplates.map((tpl, index) => (
                  <tr key={tpl.id} className="hover:bg-slate-50 transition">
                    {/* STT */}
                    <td className="p-3 text-center font-bold text-slate-500">{index + 1}</td>
                    
                    <td className="p-3 font-bold text-slate-900">
                      {tpl.name}
                      {index === 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          <Clock size={10} /> Dùng gần nhất
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-mono text-slate-500 max-w-[150px] truncate">{tpl.google_doc_id}</td>

                    <td className="p-3 font-mono text-slate-500 max-w-[150px] truncate">
                      {tpl.google_folder_id || <span className="text-slate-300">-</span>}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {tpl.field_definitions?.map((f, i) => (
                          <span key={i} className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px] font-mono">
                            {`{{${f.key}}}`}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* THAO TÁC SỬA / XÓA */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(tpl)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa mẫu này"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Bạn có chắc muốn xóa mẫu này?')) {
                              await deleteTemplate(tpl.id);
                              fetchData();
                            }
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Xóa mẫu"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}