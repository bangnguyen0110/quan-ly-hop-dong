'use client';

import { useEffect, useState } from 'react';
import { ContractAppendix, Contract } from '@/types/database';
import { getContracts, updateContract } from '@/lib/contracts';
import {
  getAppendices,
  createAppendix,
  updateAppendix,
  deleteAppendix,
  uploadAppendixFile,
} from '@/lib/appendices';
import { AppendixSchema } from '@/lib/validations';
import {
  FileSignature, Plus, Trash2, Search,
  Eye, Calendar, DollarSign, X, Pencil, FileText, Loader2, Paperclip, ArrowLeft, Save
} from 'lucide-react';
import Link from 'next/link';

export default function AppendicesPage() {
  const [appendices, setAppendices] = useState<ContractAppendix[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractId, setSelectedContractId] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppendix, setSelectedAppendix] = useState<ContractAppendix | null>(null);
  const [editingAppendix, setEditingAppendix] = useState<ContractAppendix | null>(null);
  const [saving, setSaving] = useState(false);

  const [contractId, setContractId] = useState('');
  const [title, setTitle] = useState('');
  const [appendixCode, setAppendixCode] = useState('');
  const [value, setValue] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [updateParentContract, setUpdateParentContract] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [appendicesData, contractsData] = await Promise.all([
        getAppendices(),
        getContracts(),
      ]);
      setAppendices(appendicesData);
      setContracts(contractsData);
    } catch (err: unknown) {
      console.error('Lỗi khi nạp dữ liệu phụ lục:', err);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setEditingAppendix(null);
    setContractId('');
    setTitle('');
    setAppendixCode('');
    setValue(0);
    setEndDate('');
    setContent('');
    setFile(null);
    setFileUrl('');
    setUpdateParentContract(false);
    setFormError(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    if (contracts.length > 0) setContractId(contracts[0].id);
    setShowModal(true);
  };

  const handleOpenEditModal = (appendix: ContractAppendix) => {
    setEditingAppendix(appendix);
    setContractId(appendix.contract_id || '');
    setTitle(appendix.title || '');
    setAppendixCode(appendix.appendix_code || '');
    setValue(appendix.value || 0);
    setEndDate(appendix.end_date || '');
    setContent(appendix.content || '');
    setFileUrl(appendix.file_url || '');
    setUpdateParentContract(false);
    setFile(null);
    setFormError(null);
    setShowModal(true);
  };

    const handleOpenDetailModal = (appendix: ContractAppendix) => {
    setSelectedAppendix(appendix);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payloadRaw = {
      contract_id: contractId,
      title,
      appendix_code: appendixCode || null,
      value: Number(value),
      end_date: endDate,
      content: content || null,
      file_url: fileUrl || null,
      update_parent_contract: updateParentContract,
    };

    const validationResult = AppendixSchema.safeParse(payloadRaw);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ';
      setFormError(firstError);
      return;
    }

    try {
      setSaving(true);
      let resolvedFileUrl = editingAppendix ? editingAppendix.file_url : '';
      if (file) {
        resolvedFileUrl = await uploadAppendixFile(file);
      } else if (fileUrl) {
        resolvedFileUrl = fileUrl;
      }

      const payload = {
        contract_id: contractId,
        title,
        appendix_code: appendixCode || undefined,
        value: Number(value),
        end_date: endDate,
        file_url: resolvedFileUrl || undefined,
        content: content || undefined,
      };

      if (editingAppendix) {
        await updateAppendix(editingAppendix.id, payload);
      } else {
        await createAppendix(payload);
      }

      // Nếu chọn tự động cập nhật, cập nhật end_date và value vào hợp đồng gốc
      if (updateParentContract) {
        await updateContract(contractId, {
          end_date: endDate,
          value: Number(value),
        });
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Thao tác thất bại';
      setFormError('Lỗi khi lưu phụ lục: ' + message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa phụ lục này?')) {
      try {
        await deleteAppendix(id);
        fetchData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Thao tác thất bại';
        alert('Lỗi khi xóa: ' + message);
      }
    }
  };

  const filteredAppendices = appendices.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.appendix_code && a.appendix_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.contract?.title && a.contract.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesContract = selectedContractId === 'all' || a.contract_id === selectedContractId;
    return matchesSearch && matchesContract;
  });

    const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Back / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileSignature className="text-blue-600" /> Quản Lý Phụ Lục Hợp Đồng
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Quản lý và lưu trữ các phụ lục bổ sung, thay đổi điều khoản hợp đồng.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            <Plus size={18} /> Thêm Phụ Lục Mới
          </button>
        </div>
        <Link href="/" className="text-slate-600 hover:text-blue-600 flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> Quay lại Trang chủ
        </Link>
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên phụ lục, mã phụ lục, tên hợp đồng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-72">
            <select
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">-- Tất cả hợp đồng --</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.contract_code ? `(${c.contract_code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span>Đang tải danh sách phụ lục hợp đồng...</span>
          </div>
        ) : filteredAppendices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <FileSignature className="text-slate-300" size={48} />
            <p className="font-semibold text-slate-700">Chưa có phụ lục hợp đồng nào</p>
            <p className="text-xs text-slate-400">
              Nhấn &quot;Thêm Phụ Lục Mới&quot; để tạo phụ lục bổ sung cho hợp đồng.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
                  <th className="p-4">Tên Phụ Lục</th>
                  <th className="p-4">Hợp Đồng Cha</th>
                  <th className="p-4">Giá Trị Phụ Lục</th>
                  <th className="p-4">Ngày Hết Hạn</th>
                  <th className="p-4">Tệp Kèm Theo</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAppendices.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-medium text-slate-900">
                      <div>
                        <span>{a.title}</span>
                        {a.appendix_code && (
                          <span className="block text-xs font-mono text-slate-400 mt-0.5">
                            Mã: {a.appendix_code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {a.contract ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <FileText size={15} className="text-blue-500 shrink-0" />
                          <span className="font-medium">{a.contract.title}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-900">
                      {formatCurrency(a.value)}
                    </td>
                    <td className="p-4 text-slate-600">
                      {a.end_date ? new Date(a.end_date).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                    <td className="p-4">
                      {a.file_url ? (
                        <a
                          href={a.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg font-medium border border-blue-200/60 transition"
                        >
                          <Paperclip size={13} />
                          <span>Tải file</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Không có</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetailModal(a)}
                          title="Xem chi tiết"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(a)}
                          title="Chỉnh sửa"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          title="Xóa phụ lục"
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Trash2 size={18} />
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
     

      {/* MODAL THÊM / SỬA PHỤ LỤC */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                {editingAppendix ? 'Chỉnh Sửa Phụ Lục' : 'Thêm Phụ Lục Mới'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                  {formError}
                </div>
              )}

              {/* Chọn Hợp đồng gốc */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Hợp đồng gốc <span className="text-red-500">*</span>
                </label>
                <select
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Chọn hợp đồng...</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.contract_code ? `(${c.contract_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mã phụ lục & Tiêu đề */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Mã phụ lục (VD: PL01/HD-2026)
                  </label>
                  <input
                    type="text"
                    value={appendixCode}
                    onChange={(e) => setAppendixCode(e.target.value)}
                    placeholder="PL01/HD-2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tiêu đề / Nội dung phụ lục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Gia hạn hợp đồng & Bổ sung ngân sách"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                                </div>
              </div>

              {/* Giá trị & Ngày hết hạn */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Giá trị điều chỉnh (VNĐ)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setValue(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ngày hết hạn mới (Ngày gia hạn) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox tự động cập nhật */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200/60">
                <input
                  type="checkbox"
                  id="updateParentContract"
                  checked={updateParentContract}
                  onChange={(e) => setUpdateParentContract(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="updateParentContract" className="text-sm text-slate-700">
                  <span className="font-medium">Tự động cập nhật</span> Ngày hết hạn và Giá trị mới này vào Hợp đồng gốc.
                </label>
              </div>

              {/* File URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Đường dẫn File phụ lục (Google Drive Link / PDF)
                </label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Upload File */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Hoặc tải lên tệp tin
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {/* Nút lưu & Hủy */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-xs transition text-sm disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{editingAppendix ? 'Cập Nhật Phụ Lục' : 'Tạo Phụ Lục'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT PHỤ LỤC */}
      {showDetailModal && selectedAppendix && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="text-blue-600" size={20} />
                Chi Tiết Phụ Lục
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500 block text-xs">Mã phụ lục:</span>
                <span className="font-semibold text-slate-800">{selectedAppendix.appendix_code || 'Không có'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Tiêu đề:</span>
                <span className="font-semibold text-slate-800">{selectedAppendix.title}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Hợp đồng cha:</span>
                <span className="font-semibold text-slate-800">{selectedAppendix.contract?.title || 'Không rõ'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Giá trị điều chỉnh:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(selectedAppendix.value)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Ngày hết hạn mới:</span>
                <span className="font-semibold text-slate-800">{selectedAppendix.end_date ? new Date(selectedAppendix.end_date).toLocaleDateString('vi-VN') : 'N/A'}</span>
              </div>
              {selectedAppendix.content && (
                <div>
                  <span className="text-slate-500 block text-xs">Ghi chú / Nội dung:</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">{selectedAppendix.content}</p>
                </div>
              )}
              {selectedAppendix.file_url && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Tệp đính kèm:</span>
                  <a
                    href={selectedAppendix.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 font-medium hover:bg-blue-100 transition"
                  >
                    <Paperclip size={14} />
                    Mở tệp tin phụ lục
                  </a>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
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





