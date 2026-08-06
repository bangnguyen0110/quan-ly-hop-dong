'use client';

import { useEffect, useState } from 'react';
import { Contract } from '@/types/database';
import { getContracts, createContract, uploadContractFile, deleteContract } from '@/lib/contracts';
import { 
  FileText, Plus, Trash2, Download, CheckCircle, Clock, Search, 
  Eye, Calendar, DollarSign, X 
} from 'lucide-react';

export default function HomePage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [contractCode, setContractCode] = useState('');
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('');
  const [value, setValue] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [customDays, setCustomDays] = useState('1, 7');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getContracts();
      setContracts(data);
    } catch (err) {
      console.error('Lỗi lấy dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await createContract({
        title,
        contract_code: contractCode,
        party_a: partyA,
        party_b: partyB,
        value: Number(value),
        end_date: endDate,
        file_url: fileUrl,
        status: 'active',
        custom_notify_days: notifyDaysArray.length > 0 ? notifyDaysArray : [1, 7],
      });

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert('Lỗi khi thêm hợp đồng: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) {
      await deleteContract(id);
      fetchData();
    }
  };

  const resetForm = () => {
    setTitle('');
    setContractCode('');
    setPartyA('');
    setPartyB('');
    setValue(0);
    setEndDate('');
    setCustomDays('1, 7');
    setFile(null);
  };

  const filteredContracts = contracts.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contract_code && c.contract_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600" /> Quản Lý Hợp Đồng
          </h1>
          <p className="text-sm text-slate-500 mt-1">Hệ thống theo dõi và cảnh báo hết hạn tự động</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition shadow-md shadow-blue-600/20"
        >
          <Plus size={18} /> Thêm hợp đồng
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng Hợp Đồng</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{contracts.length}</h3>
          </div>
          <FileText className="text-blue-600 bg-blue-50 p-3 rounded-xl" size={48} />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Đang Hiệu Lực</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {contracts.filter((c) => c.status === 'active').length}
            </h3>
          </div>
          <CheckCircle className="text-emerald-500 bg-emerald-50 p-3 rounded-xl" size={48} />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Cảnh Báo Hết Hạn</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {contracts.filter((c) => c.custom_notify_days?.length > 0).length}
            </h3>
          </div>
          <Clock className="text-amber-500 bg-amber-50 p-3 rounded-xl" size={48} />
        </div>
      </div>

      {/* List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center gap-3">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc mã hợp đồng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none text-sm bg-transparent text-slate-900"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200/80">
                  <th className="p-4">Tên / Mã HĐ</th>
                  <th className="p-4">Đối tác (Bên B)</th>
                  <th className="p-4">Giá trị (VNĐ)</th>
                  <th className="p-4">Ngày hết hạn</th>
                  <th className="p-4">Mốc báo trước</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-400">{c.contract_code || 'Chưa có mã'}</p>
                    </td>
                    <td className="p-4 text-slate-600">{c.party_b || '-'}</td>
                    <td className="p-4 font-semibold text-slate-900">
                      {Number(c.value).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4 font-semibold text-red-600">{c.end_date}</td>
                    <td className="p-4">
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-amber-200">
                        {c.custom_notify_days?.join(', ')} ngày
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 1/ TÍNH NĂNG XEM CHI TIẾT */}
                        <button
                          onClick={() => setSelectedContract(c)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        {c.file_url && (
                          <a
                            href={c.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Tải file"
                          >
                            <Download size={18} />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Xóa"
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

      {/* MODAL XEM CHI TIẾT HỢP ĐỒNG */}
      {selectedContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 border border-slate-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {selectedContract.contract_code || 'HỢP ĐỒNG'}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  {selectedContract.title}
                </h2>
              </div>
              <button onClick={() => setSelectedContract(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Bên A (Chủ thể)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedContract.party_a || 'Chưa cập nhật'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Bên B (Đối tác)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedContract.party_b || 'Chưa cập nhật'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <DollarSign className="text-emerald-500" size={20} />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Giá trị hợp đồng</p>
                    <p className="font-bold text-slate-900">{Number(selectedContract.value).toLocaleString('vi-VN')} VNĐ</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Calendar className="text-red-500" size={20} />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Ngày hết hạn</p>
                    <p className="font-bold text-red-600">{selectedContract.end_date}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Mốc gửi thông báo trước:</span>
                <span className="font-semibold text-amber-600">{selectedContract.custom_notify_days?.join(', ')} ngày</span>
              </div>

              {selectedContract.file_url ? (
                <a
                  href={selectedContract.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-100 transition"
                >
                  <Download size={18} /> Xem & Tải về File Hợp Đồng
                </a>
              ) : (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Không có file đính kèm
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedContract(null)}
              className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL THÊM HỢP ĐỒNG MỚI */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900">Thêm Hợp Đồng Mới</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Hợp Đồng *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mã Hợp Đồng</label>
                  <input
                    type="text"
                    value={contractCode}
                    onChange={(e) => setContractCode(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Giá trị (VNĐ)</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bên A</label>
                  <input
                    type="text"
                    value={partyA}
                    onChange={(e) => setPartyA(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bên B (Đối tác)</label>
                  <input
                    type="text"
                    value={partyB}
                    onChange={(e) => setPartyB(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày Hết Hạn *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mốc báo trước (ngày)</label>
                  <input
                    type="text"
                    placeholder="1, 7, 15, 30"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">File Hợp Đồng (PDF/Docx)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border rounded-xl text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-md shadow-blue-600/20"
                >
                  {uploading ? 'Đang lưu...' : 'Lưu Hợp Đồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}