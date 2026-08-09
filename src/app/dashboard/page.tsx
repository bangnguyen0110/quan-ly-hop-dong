'use client';

import { useEffect, useState } from 'react';
import { Contract } from '@/types/database';
import { getContracts } from '@/lib/contracts';
import { FileText, CalendarDays, DollarSign, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight, X, LayoutList, LayoutGrid, Send } from 'lucide-react';

export default function DashboardPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // View mode toggle state exists for future use; UI currently defaults to grid layout.
  const toggleViewMode = () => setViewMode((prev) => (prev === 'grid' ? 'table' : 'grid'));

  const [testingCron, setTestingCron] = useState(false);
  const [cronTestResult, setCronTestResult] = useState<string | null>(null);

  const handleTestCron = async () => {
    setTestingCron(true);
    setCronTestResult(null);
    try {
      const res = await fetch('/api/cron/check-expiration?force=true');
      const data = await res.json().catch(() => ({}));
      setCronTestResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không xác định';
      setCronTestResult('Lỗi: ' + message);
    } finally {
      setTestingCron(false);
    }
  };

  async function fetchContracts() {
    try {
      setLoading(true);
      const data = await getContracts();
      setContracts(data);
    } catch (err) {
      console.error('Loi:', err);
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect -- data fetching on mount */
  useEffect(() => { fetchContracts(); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalContracts = contracts.length;
  const totalValue = contracts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const activeContracts = contracts.filter((c) => getDaysLeft(c.end_date) >= 0).length;
  const expiringSoon = contracts.filter((c) => { const days = getDaysLeft(c.end_date); return days >= 0 && days <= 30; }).length;
  const expiredContracts = contracts.filter((c) => getDaysLeft(c.end_date) < 0).length;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = (new Date(year, month, 1).getDay() + 7 - 1) % 7;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getContractsForDay = (day: number) => {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    return contracts.filter((c) => c.end_date === dateStr);
  };

  const getStatusColor = (endDate: string) => {
    const daysLeft = getDaysLeft(endDate);
    if (daysLeft < 0) return 'bg-red-100 text-red-700 border-red-200';
    if (daysLeft <= 30) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getStatusDot = (endDate: string) => {
    const daysLeft = getDaysLeft(endDate);
    if (daysLeft < 0) return 'bg-red-500';
    if (daysLeft <= 30) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const monthNames = ['Thang 1','Thang 2','Thang 3','Thang 4','Thang 5','Thang 6','Thang 7','Thang 8','Thang 9','Thang 10','Thang 11','Thang 12'];
  const daysOfWeek = ['T2','T3','T4','T5','T6','T7','CN'];

  const calendarDays: Array<{ day: number; isCurrentMonth: boolean; dateStr?: string }> = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push({ day: 0, isCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    calendarDays.push({ day, isCurrentMonth: true, dateStr });
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='text-slate-500'>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900 flex items-center gap-2'>
            <CalendarDays className='text-blue-600' />
            Dashboard Tổng Quan
          </h1>
          <p className='text-sm text-slate-500 mt-1'>Dashboard tổng quan hợp đồng</p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={toggleViewMode}
            className='flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition'
            title='Chuyển đổi chế độ hiển thị'
          >
            {viewMode === 'grid' ? <LayoutGrid size={16} /> : <LayoutList size={16} />}
            <span className='hidden sm:inline'>{viewMode === 'grid' ? 'Lưới' : 'Danh sách'}</span>
          </button>
          <button
            onClick={handleTestCron}
            disabled={testingCron}
            className='flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-60'
          >
            <Send size={16} />
            <span className='hidden sm:inline'>{testingCron ? 'Đang chạy...' : 'Chạy thử Cron'}</span>
          </button>
        </div>
      </div>

      {cronTestResult && (
        <div className='bg-slate-900 text-slate-50 rounded-2xl p-4 text-xs font-mono whitespace-pre-wrap'>
          {cronTestResult}
        </div>
      )}

      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'>
        <div className='bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2'>
          <div className='flex items-center gap-2 text-blue-600'><FileText size={20} /><span className='text-xs font-semibold uppercase'>Tỏng HĐ</span></div>
          <p className='text-3xl font-bold text-slate-900'>{totalContracts}</p>
        </div>
        <div className='bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2'>
          <div className='flex items-center gap-2 text-emerald-600'><DollarSign size={20} /><span className='text-xs font-semibold uppercase'>Tổng Giá Trị</span></div>
          <p className='text-2xl font-bold text-slate-900'>{(totalValue / 1_000_000_000).toFixed(1)}B</p>
          <p className='text-[10px] text-slate-400'>VNĐ</p>
        </div>
        <div className='bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2'>
          <div className='flex items-center gap-2 text-emerald-600'><CheckCircle2 size={20} /><span className='text-xs font-semibold uppercase'>Đang hiệu lực</span></div>
          <p className='text-3xl font-bold text-emerald-600'>{activeContracts}</p>
        </div>
        <div className='bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2'>
          <div className='flex items-center gap-2 text-amber-600'><Clock size={20} /><span className='text-xs font-semibold uppercase'>Sắp hết hạn</span></div>
          <p className='text-3xl font-bold text-amber-600'>{expiringSoon}</p>
          <p className='text-[10px] text-slate-400'>Trong 30 ngày tới</p>
        </div>
        <div className='bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2'>
          <div className='flex items-center gap-2 text-red-600'><XCircle size={20} /><span className='text-xs font-semibold uppercase'>Đã hết hạn</span></div>
          <p className='text-3xl font-bold text-red-600'>{expiredContracts}</p>
        </div>
      </div>

      <div className='bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-lg font-bold text-slate-900'>{monthNames[month]} / {year}</h2>
          <div className='flex items-center gap-2'>
            <button onClick={prevMonth} className='p-2 hover:bg-slate-100 rounded-lg transition' title='Thang truoc'><ChevronLeft size={20} /></button>
            <button onClick={goToToday} className='px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition'>Hôm nay</button>
            <button onClick={nextMonth} className='p-2 hover:bg-slate-100 rounded-lg transition' title='Thang sau'><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-4 mb-4 text-xs'>
          <div className='flex items-center gap-1.5'><div className='w-3 h-3 rounded-full bg-emerald-500'></div><span>Còn hạn {'>'}30 ngày</span></div>
          <div className='flex items-center gap-1.5'><div className='w-3 h-3 rounded-full bg-amber-500'></div><span>Sắp hết hạn {'<'}30 ngày</span></div>
          <div className='flex items-center gap-1.5'><div className='w-3 h-3 rounded-full bg-red-500'></div><span>Đã hết hạn</span></div>
        </div>

        <div className='grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200'>
          {daysOfWeek.map((d) => (
            <div key={d} className='bg-slate-50 p-2 sm:p-3 text-center text-xs font-semibold text-slate-600'>{d}</div>
          ))}
          {calendarDays.map((cell, idx) => {
            const dayContracts = cell.isCurrentMonth && cell.dateStr ? getContractsForDay(cell.day) : [];
            const isToday = cell.day === new Date().getDate() && cell.dateStr === new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
            return (
              <div key={idx} className={'bg-white min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 ' + (cell.isCurrentMonth ? '' : 'bg-slate-50/50')}>
                {cell.isCurrentMonth && (
                  <>
                    <div className='flex items-center justify-between mb-1'>
                      <span className={'text-xs font-semibold ' + (isToday ? 'w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white' : 'text-slate-700')}>{cell.day}</span>
                      {dayContracts.length > 0 && <span className='text-[10px] text-slate-400'>{dayContracts.length}</span>}
                    </div>
                    <div className='space-y-1'>
                      {dayContracts.map((c) => (
                        <button key={c.id} onClick={() => setSelectedContract(c)} className={'w-full text-left text-[10px] sm:text-xs px-1.5 py-1 rounded border ' + getStatusColor(c.end_date) + ' truncate'} title={c.title + ' - ' + c.end_date}>
                          <span className='flex items-center gap-1'><span className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + getStatusDot(c.end_date)}></span><span className='truncate'>{c.title}</span></span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedContract && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
          <div className='bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-w-lg w-full space-y-4'>
            <div className='flex justify-between items-start border-b pb-4'>
              <div>
                <span className='text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase'>{selectedContract.category?.name || 'CHUA PHAN LOAI'}</span>
                <h2 className='text-xl font-bold text-slate-900 mt-2'>{selectedContract.title}</h2>
              </div>
              <button onClick={() => setSelectedContract(null)} className='p-1 text-slate-400 hover:text-slate-600'><X size={20} /></button>
            </div>

            <div className='space-y-3 text-sm text-slate-600'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-slate-50 p-3 rounded-xl'><p className='text-xs text-slate-400 font-medium'>Mã hợp đồng</p><p className='font-semibold text-slate-800'>{selectedContract.contract_code || 'Chua co ma'}</p></div>
                <div className='bg-slate-50 p-3 rounded-xl'><p className='text-xs text-slate-400 font-medium'>Giá trị</p><p className='font-semibold text-slate-800'>{Number(selectedContract.value).toLocaleString('vi-VN')} VNĐ</p></div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-slate-50 p-3 rounded-xl'><p className='text-xs text-slate-400 font-medium'>Bên A (Doi tac)</p><p className='font-semibold text-slate-800'>{selectedContract.party_a || 'Chua cap nhat'}</p></div>
                <div className='bg-slate-50 p-3 rounded-xl'><p className='text-xs text-slate-400 font-medium'>Bên B</p><p className='font-semibold text-slate-800'>{selectedContract.party_b || 'Chua cap nhat'}</p></div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-slate-50 p-3 rounded-xl'><p className='text-xs text-slate-400 font-medium'>Ngày bắt đầu</p><p className='font-semibold text-slate-800'>{selectedContract.start_date || 'Chua cap nhat'}</p></div>
                <div className='bg-slate-50 p-3 rounded-xl'><p className='text-xs text-slate-400 font-medium'>Ngày hết hạn</p><p className='font-semibold text-red-600'>{selectedContract.end_date}</p></div>
              </div>
            </div>

            <div className='flex gap-2 pt-2'>
              <button onClick={() => setSelectedContract(null)} className='flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition'>Đồng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDaysLeft(endDateStr: string): number {
  if (!endDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
