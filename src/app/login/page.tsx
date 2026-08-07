import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full space-y-6">
        
        {/* LOGO VÀ TÊN CÔNG TY */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="HIỀN NHÂN GROUP" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-wide uppercase">
              CÔNG TY CỔ PHẦN HIỀN NHÂN GROUP
            </h1>
            <p className="text-xs text-blue-600 font-semibold mt-1">
              HỆ THỐNG QUẢN LÝ HỢP ĐỒNG
            </p>
          </div>
        </div>

        {/* FORM ĐĂNG NHẬP... */}
      </div>
    </div>
  );
}