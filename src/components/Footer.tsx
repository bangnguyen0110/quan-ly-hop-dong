import { Building2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white/90 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center justify-center sm:justify-start gap-2 font-semibold text-slate-700 uppercase tracking-wide">
          <Building2 size={14} className="text-blue-600 shrink-0" />
          <span>CÔNG TY CỔ PHẦN HIỀN NHÂN GROUP</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
          <span>Mã số thuế: <span className="font-medium text-slate-700">1702299833</span></span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">•</span>
          <span>Cấp ngày 30/08/2024 bởi Rạch Giá - Thuế cơ sở 1 tỉnh An Giang</span>
        </div>
      </div>
    </footer>
  );
}