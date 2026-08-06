'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Shield, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Cắt bỏ khoảng trắng thừa ở đầu/cuối username
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      const { data, error: dbError } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password', cleanPassword)
        .maybeSingle(); // Dùng maybeSingle để tránh ngắt luồng khi không tìm thấy

      if (dbError) {
        // Hiển thị lỗi chi tiết từ Supabase nếu có
        setError(`Lỗi Database: ${dbError.message}`);
      } else if (!data) {
        setError('Tài khoản hoặc mật khẩu không chính xác!');
      } else {
        // Lưu trạng thái đăng nhập
        localStorage.setItem('auth_user', JSON.stringify({ username: data.username }));
        
        // Chuyển hướng sang trang chủ
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(`Lỗi kết nối: ${err.message || 'Không thể gọi Supabase'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2">
            <Shield size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ĐĂNG NHẬP HỆ THỐNG</h1>
          <p className="text-xs text-slate-500">Phần mềm Quản lý Hợp đồng CRM</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" /> 
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên tài khoản</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                required
                placeholder="Nhập tên tài khoản"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}