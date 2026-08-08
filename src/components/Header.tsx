'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Home, CalendarDays, FileText, PlusCircle, Send, LogOut } from 'lucide-react';
import Image from 'next/image';

const MENU_ITEMS = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: CalendarDays },
  { href: '/templates', label: 'Mẫu hợp đồng', icon: FileText },
  { href: '/appendices', label: 'Phụ lục', icon: PlusCircle },
  { href: 'https://t.me/hiennhangroup', label: 'Telegram', icon: Send, external: true },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Khóa cuộn body khi drawer mở để tránh scroll lén phía sau
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
      {/* Header: Logo + Tên công ty (trái), Nút Menu (phải - cả Mobile & Desktop) */}
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
                Quản lý Hợp đồng
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

      {/* Backdrop overlay - che toàn màn hình; bấm vào sẽ đóng Menu Sidebar */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-40"
        />
      )}

      {/* Slide-in Sidebar trượt từ BÊN TRÁI màn hình */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-50 flex flex-col shadow-xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Tên công ty ở đầu drawer */}
        <div className="p-4 border-b border-slate-200">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 hover:opacity-90 transition"
          >
            <Image
              src="/logo.png"
              alt="HIỀN NHÂN GROUP"
              width={40}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <div className="border-l border-slate-200 pl-3">
              <div className="text-sm font-bold text-slate-900 tracking-wider uppercase">
                HIỀN NHÂN GROUP
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                HỆ THỐNG QUẢN LÝ HỢP ĐỒNG
              </div>
            </div>
          </Link>
        </div>

        {/* Danh sách liên kết */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Nút Đăng xuất ở dưới cùng */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
