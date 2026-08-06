'use client';

import './globals.css';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Kiểm tra quyền đăng nhập
    const authUser = localStorage.getItem('auth_user');
    if (!authUser && pathname !== '/login') {
      setAuthorized(false);
      router.push('/login');
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (!authorized && pathname !== '/login') {
    return (
      <html lang="vi">
        <body className="bg-slate-100 min-h-screen flex items-center justify-center text-slate-500 text-sm">
          Đang xác thực quyền truy cập...
        </body>
      </html>
    );
  }

  return (
    <html lang="vi">
      <body className="bg-slate-100 text-slate-900 min-h-screen antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          {/* md:ml-64 giúp nội dung main lùi sang bên phải 256px, KHÔNG BỊ MENU ĐÈ */}
          <main className={`flex-1 w-full ${pathname !== '/login' ? 'md:ml-64' : ''} transition-all`}>
            <div className={`${pathname !== '/login' ? 'p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto' : ''}`}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}