'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  CalendarDays,
  FileText,
  PlusCircle,
  Send,
  LogOut,
  ChevronDown,
  Briefcase,
  Boxes,
  PackagePlus,
  Layers,
  GitCompare,
} from 'lucide-react';
import Image from 'next/image';

const CONTRACT_ITEMS = [
  { href: '/', label: 'Danh sách hợp đồng', icon: Home },
  { href: '/dashboard', label: 'Dashboard & Lịch', icon: CalendarDays },
  { href: '/templates', label: 'Mẫu hợp đồng', icon: FileText },
  { href: '/appendices', label: 'Phụ lục', icon: PlusCircle },
  { href: '/telegram', label: 'Cấu hình Telegram', icon: Send },
];

const PACKAGE_ITEMS = [
  { href: '/packages', label: 'Tổng quan', icon: Boxes },
  { href: '/packages/new', label: 'Tạo gói mới', icon: PackagePlus },
  { href: '/packages/combo/new', label: 'Tạo gói Combo/ Custom', icon: Layers },
  { href: '/packages/compare', label: 'So sánh gói', icon: GitCompare },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // State đóng/mở cho 2 nhóm menu lớn
  const [contractOpen, setContractOpen] = useState(true);
  const [packageOpen, setPackageOpen] = useState(true);

  // Tự động mở menu tương ứng theo trang người dùng đang truy cập
  useEffect(() => {
    if (pathname.startsWith('/packages')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ menu theo route hiện tại
      setPackageOpen(true);
    } else {
      setContractOpen(true);
    }
  }, [pathname]);

  // Khóa cuộn body khi drawer mở
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
    }
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Header: Logo + Tên công ty (trái), Nút Menu (phải) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
            <Image
              src="/logo.png"
              alt="HIỀN NHÂN GROUP Logo"
              width={36}
              height={36}
              className="h-9 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <div className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                HIỀN NHÂN GROUP
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Quản lý Hợp đồng & Dịch vụ
              </div>
            </div>
          </Link>

          <button
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition text-slate-700"
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Backdrop overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-40 transition-opacity"
        />
      )}

      {/* Slide-in Sidebar trượt từ BÊN TRÁI màn hình */}
      <aside
        className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white border-r border-slate-200 z-50 flex flex-col shadow-xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Tên công ty ở đầu drawer */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 hover:opacity-90 transition"
          >
            <Image
              src="/logo.png"
              alt="HIỀN NHÂN GROUP"
              width={38}
              height={38}
              className="h-9 w-auto object-contain"
            />
            <div className="border-l border-slate-200 pl-3">
              <div className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                HIỀN NHÂN GROUP
              </div>
              <div className="text-[10px] text-blue-600 font-semibold">
                HỆ THỐNG ĐIỀU HÀNH
              </div>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Danh sách nhóm menu cuộn độc lập */}
        <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
          {/* ================= NHÓM 1: QUẢN LÝ HỢP ĐỒNG ================= */}
          <div className="space-y-1">
            <button
              onClick={() => setContractOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <span className="flex items-center gap-2 text-slate-800 uppercase tracking-wide">
                <FileText size={16} className="text-blue-600" />
                Quản lý hợp đồng
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 ${
                  contractOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {contractOpen && (
              <div className="ml-3 pl-3 border-l-2 border-slate-100 space-y-1 pt-1 animate-in fade-in duration-200">
                {CONTRACT_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={active ? 'text-blue-600' : 'text-slate-400'}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= NHÓM 2: QUẢN LÝ GÓI SP/DV ================= */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <button
              onClick={() => setPackageOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <span className="flex items-center gap-2 text-slate-800 uppercase tracking-wide">
                <Briefcase size={16} className="text-emerald-600" />
                Quản lý gói SP/DV
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 ${
                  packageOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {packageOpen && (
              <div className="ml-3 pl-3 border-l-2 border-slate-100 space-y-1 pt-1 animate-in fade-in duration-200">
                {PACKAGE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition ${
                        active
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={active ? 'text-emerald-600' : 'text-slate-400'}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Nút Đăng xuất ở dưới cùng */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
          >
            <LogOut size={16} />
            <span>Đăng xuất hệ thống</span>
          </button>
        </div>
      </aside>
    </>
  );
}