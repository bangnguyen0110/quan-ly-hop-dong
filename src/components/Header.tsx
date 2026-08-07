import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* LOGO & TÊN CÔNG TY TRÊN HEADER */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
          <img 
            src="/logo.png" 
            alt="HIỀN NHÂN GROUP Logo" 
            className="h-10 w-auto object-contain"
          />
          <div className="border-l border-slate-200 pl-3">
            <div className="text-xs font-bold text-slate-900 tracking-wider uppercase">
              HIỀN NHÂN GROUP
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Quản lý Hợp đồng
            </div>
          </div>
        </Link>

        {/* CÁC MENU NÚT BẤM KHÁC... */}
      </div>
    </header>
  );
}