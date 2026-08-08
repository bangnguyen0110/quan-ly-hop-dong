'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { User, Lock, Loader2 } from 'lucide-react';

const mapSupabaseError = (message: string): string => {
  if (message === 'Invalid login credentials') {
    return 'Tài khoản hoặc Mật khẩu không chính xác. Vui lòng kiểm tra lại Email đã tạo trong Supabase Dashboard -> Authentication -> Users.';
  }
  return message || 'Đăng nhập thất bại. Vui lòng thử lại sau.';
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const inputAccount = username.trim().toLowerCase();

      // Lần thử 1: đăng nhập bằng chính xác những gì người dùng nhập vào ô Tài khoản/Email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: inputAccount,
        password,
      });

      if (error) {
        // Nếu thất bại và tài khoản không chứa ký tự '@', thử lại 1 lần với domain mặc định
        if (!inputAccount.includes('@')) {
          const emailWithDomain = `${inputAccount}@hiennhangroup.com`;
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: emailWithDomain,
            password,
          });

          if (retryError) {
            setError(mapSupabaseError(retryError.message));
            return;
          }

          if (retryData.session) {
            localStorage.setItem('auth_user', JSON.stringify(retryData.user));
            router.push('/');
          }
          return;
        }

        // Đã có '@' nhưng vẫn thất bại → hiển thị thông báo lỗi rõ ràng từ Supabase
        setError(mapSupabaseError(error.message));
        return;
      }

      if (data.session) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        router.push('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại sau.';
      setError(mapSupabaseError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm sm:max-w-md w-full space-y-5">
        {/* LOGO VÀ TÊN CÔNG TY */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="HIỀN NHÂN GROUP"
              width={80}
              height={80}
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide uppercase">
              CÔNG TY CỔ PHẦN HIỀN NHÂN GROUP
            </h1>
            <p className="text-[10px] sm:text-xs text-blue-600 font-semibold mt-1">
              HỆ THỐNG QUẢN LÝ HỢP ĐỒNG
            </p>
          </div>
        </div>

        {/* FORM ĐĂNG NHẬP */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tên đăng nhập / Email *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mật khẩu *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>
            {/* Checkbox Hiển thị mật khẩu - giúp người dùng kiểm tra khi gõ trên điện thoại */}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showPassword" className="text-xs text-slate-600 cursor-pointer select-none">
                Hiển thị mật khẩu
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-70"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}

