'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Layers, Bot, Menu, X, Shield, LogOut, FileSignature } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Không hiển thị Sidebar nếu ở trang Login
  if (pathname === '/login') return null;

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    router.push('/login');
  };

  const menuItems = [
    { name: 'Danh sách Hợp đồng', href: '/', icon: FileText },
    { name: 'Phụ lục Hợp đồng', href: '/appendices', icon: FileSignature },
    { name: 'Hợp đồng Mẫu', href: '/templates', icon: Layers },
    { name: 'Cấu hình Telegram', href: '/telegram', icon: Bot },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 font-bold text-blue-600">
          <Shield size={24} />
          <span>QUẢN LÝ HỢP ĐỒNG HNG</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="md:hidden fixed inset-0 bg-slate-900/50 z-40" />
      )}

      {/* Sidebar Cố Định (Fixed 256px = w-64) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-slate-200 z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-white tracking-wide">
            <Shield className="text-blue-500" size={24} />
            <span>QUẢN LÝ HỢP ĐỒNG HNG</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout Button */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              AD
            </div>
            <div className="text-xs">
              <p className="font-semibold text-white">adminhng</p>
              <p className="text-slate-500 text-[10px]">Quản trị viên</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}