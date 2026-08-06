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
    // Kiểm tra login ở Client side
    if (typeof window !== 'undefined') {
      const authUser = localStorage.getItem('auth_user');
      if (!authUser && pathname !== '/login') {
        setAuthorized(false);
        router.push('/login');
      } else {
        setAuthorized(true);
      }
    }
  }, [pathname, router]);

  return (
    <html lang="vi">
      <body className="bg-slate-100 text-slate-900 min-h-screen antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className={`flex-1 w-full ${pathname !== '/login' ? 'md:ml-64' : ''} transition-all`}>
            <div className={pathname !== '/login' ? 'p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto' : ''}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}