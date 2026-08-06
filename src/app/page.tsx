'use client';

import { useEffect, useState } from 'react';
import { Contract, Category } from '@/types/database';
import { 
  getContracts, createContract, uploadContractFile, deleteContract,
  getCategories, createCategory, deleteCategory 
} from '@/lib/contracts';
import { 
  FileText, Plus, Trash2, Download, CheckCircle, Clock, Search, 
  Eye, Calendar, DollarSign, X, Filter, Tag, AlertTriangle, Layers
} from 'lucide-react';

export default function HomePage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'expired' | '1day' | '7days'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Modal State
  const [showContractModal, setShowContractModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form State - Hợp Đồng
  const [title, setTitle] = useState('');
  const [contractCode, setContractCode] = useState('');
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('');
  const [value, setValue] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [customDays, setCustomDays] = useState('1, 7');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Form State - Loại Hợp Đồng
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, categoriesData] = await Promise.all([
        getContracts(),
        getCategories(),
      ]);
      setContracts(contractsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Lỗi lấy dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tính số ngày còn lại tới hạn
  const getDaysLeft = (endDateStr: string) => {
    if (!endDateStr) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Tạo Hợp đồng
  const handleCreateContract = async (e: React.FormEvent) => {
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
        category_id: categoryId || undefined,
      });

      setShowContractModal(false);
      resetContractForm();
      fetchData();
    } catch (err: any) {
      alert('Lỗi khi thêm hợp đồng: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Tạo Loại hợp đồng mới
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      fetchData();
    } catch (err: any) {
      alert('Lỗi thêm loại hợp đồng: ' + err.message);
    }
  };

  // Xóa Loại hợp đồng
  const handleDeleteCategory = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa loại hợp đồng này?')) {
      await deleteCategory(id);
      fetchData();
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) {
      await deleteContract(id);
      fetchData();
    }
  };

  const resetContractForm = () => {
    setTitle('');
    setContractCode('');
    setPartyA('');
    setPartyB('');
    setValue(0);
    setEndDate('');
    setCustomDays('1, 7');
    setCategoryId('');
    setFile(null);
  };

  // BỘ LỌC DỮ LIỆU
  const filteredContracts = contracts.filter((c) => {
    const daysLeft = getDaysLeft(c.end_date);
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contract_code && c.contract_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategoryId === 'all' || c.category_id === selectedCategoryId;

    let matchesStatus = true;
    if (filterType === 'active') matchesStatus = daysLeft >= 0;
    if (filterType === 'expired') matchesStatus = daysLeft < 0;
    if (filterType === '1day') matchesStatus = daysLeft >= 0 && daysLeft <= 1;
    if (filterType === '7days') matchesStatus = daysLeft >= 0 && daysLeft <= 7;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600" /> Quản Lý Hợp Đồng
          </h1>
          <p className="text-sm text-slate-500 mt-1">Hệ thống phân loại và cảnh báo mốc hết hạn tự động</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition"
          >
            <Tag size={16} /> Quản lý loại HĐ
          </button>
          <button
            onClick={() => setShowContractModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition shadow-md shadow-blue-600/20"
          >
            <Plus size={18} /> Thêm hợp đồng
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilterType('all')}
          className={`cursor-pointer p-4 rounded-2xl border shadow-sm transition ${filterType === 'all' ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200'}`}
        >
          <p className="text-xs text-slate-500 font-semibold uppercase">Tổng số HĐ</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{contracts.length}</h3>
        </div>

        <div 
          onClick={() => setFilterType('active')}
          className={`cursor-pointer p-4 rounded-2xl border shadow-sm transition ${filterType === 'active' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}`}
        >
          <p className="text-xs text-slate-500 font-semibold uppercase">Còn hạn</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">
            {contracts.filter((c) => getDaysLeft(c.end_date) >= 0).length}
          </h3>
        </div>

        <div 
          onClick={() => setFilterType('7days')}
          className={`cursor-pointer p-4 rounded-2xl border shadow-sm transition ${filterType === '7days' ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-200'}`}
        >
          <p className="text-xs text-slate-500 font-semibold uppercase">Còn ≤ 7 ngày</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">
            {contracts.filter((c) => getDaysLeft(c.end_date) >= 0 && getDaysLeft(c.end_date) <= 7).length}
          </h3>
        </div>

        <div 
          onClick={() => setFilterType('expired')}
          className={`cursor-pointer p-4 rounded-2xl border shadow-sm transition ${filterType === 'expired' ? 'bg-red-50 border-red-500' : 'bg-white border-slate-200'}`}
        >
          <p className="text-xs text-slate-500 font-semibold uppercase">Đã hết hạn</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">
            {contracts.filter((c) => getDaysLeft(c.end_date) < 0).length}
          </h3>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          {/* Tabs Lọc Hạn Hợp Đồng */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-lg transition ${filterType === 'all' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tất cả ({contracts.length})
            </button>
            <button
              onClick={() => setFilterType('active')}
              className={`px-3 py-2 rounded-lg transition ${filterType === 'active' ? 'bg-white text-emerald-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Còn hạn
            </button>
            <button
              onClick={() => setFilterType('7days')}
              className={`px-3 py-2 rounded-lg transition ${filterType === '7days' ? 'bg-white text-amber-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Còn ≤ 7 ngày
            </button>
            <button
              onClick={() => setFilterType('1day')}
              className={`px-3 py-2 rounded-lg transition ${filterType === '1day' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Còn ≤ 1 ngày
            </button>
            <button
              onClick={() => setFilterType('expired')}
              className={`px-3 py-2 rounded-lg transition ${filterType === 'expired' ? 'bg-white text-red-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Đã hết hạn
            </button>
          </div>

          {/* Lọc Theo Loại Hợp Đồng */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 outline-none font-medium text-slate-700"
            >
              <option value="all">Tất cả loại hợp đồng</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ô Tìm Kiếm */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã hợp đồng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* DANH SÁCH BẢNG HỢP ĐỒNG */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200/80">
                  <th className="p-4">Tên / Mã HĐ</th>
                  <th className="p-4">Loại Hợp Đồng</th>
                  <th className="p-4">Đối tác (Bên B)</th>
                  <th className="p-4">Giá trị (VNĐ)</th>
                  <th className="p-4">Ngày hết hạn</th>
                  <th className="p-4">Trạng thái hạn</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredContracts.map((c) => {
                  const daysLeft = getDaysLeft(c.end_date);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">{c.title}</p>
                        <p className="text-xs text-slate-400">{c.contract_code || 'Chưa có mã'}</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium border border-blue-200/60">
                          {c.category?.name || 'Chưa phân loại'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{c.party_b || '-'}</td>
                      <td className="p-4 font-semibold text-slate-900">
                        {Number(c.value).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{c.end_date}</td>
                      <td className="p-4">
                        {daysLeft < 0 ? (
                          <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                            Đã hết hạn ({Math.abs(daysLeft)} ngày)
                          </span>
                        ) : daysLeft === 0 ? (
                          <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                            Hết hạn HÔM NAY
                          </span>
                        ) : daysLeft <= 7 ? (
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-xs font-semibold">
                            Còn {daysLeft} ngày
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                            Còn {daysLeft} ngày
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
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
                            onClick={() => handleDeleteContract(c.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL QUẢN LÝ LOẠI HỢP ĐỒNG */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Tag size={18} className="text-blue-600" /> Quản Lý Loại Hợp Đồng
              </h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Tên loại hợp đồng mới..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition shrink-0"
              >
                Thêm
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto divide-y">
              {categories.map((cat) => (
                <div key={cat.id} className="pt-2 flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-700">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM HỢP ĐỒNG */}
      {showContractModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900">Thêm Hợp Đồng Mới</h2>
            <form onSubmit={handleCreateContract} className="space-y-4">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Loại Hợp Đồng</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">-- Chọn loại --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mã Hợp Đồng</label>
                  <input
                    type="text"
                    value={contractCode}
                    onChange={(e) => setContractCode(e.target.value)}
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Giá trị (VNĐ)</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full border rounded-xl p-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
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
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2.5 border rounded-xl text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
                >
                  {uploading ? 'Đang lưu...' : 'Lưu Hợp Đồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT HỢP ĐỒNG */}
      {selectedContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 border border-slate-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">
                  {selectedContract.category?.name || 'CHƯA PHÂN LOẠI'}
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
                  <p className="text-xs text-slate-400 font-medium">Bên A</p>
                  <p className="font-semibold text-slate-800">{selectedContract.party_a || 'Chưa cập nhật'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Bên B (Đối tác)</p>
                  <p className="font-semibold text-slate-800">{selectedContract.party_b || 'Chưa cập nhật'}</p>
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

              {selectedContract.file_url && (
                <a
                  href={selectedContract.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-100 transition"
                >
                  <Download size={18} /> Xem & Tải về File Hợp Đồng
                </a>
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
    </div>
  );
}