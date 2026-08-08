'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bot, Save, Send, CheckCircle2, AlertCircle, Info, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TelegramPage() {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notifyTime, setNotifyTime] = useState('11:35');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const defaultTemplate = `🔔 *CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN*

📜 *Tên HĐ:* {ten_hd}
🏷️ *Mã HĐ:* {ma_hd}
👥 *Đối tác:* {doi_tac}
💰 *Giá trị:* {gia_tri} VNĐ
⏳ *Thời gian còn lại:* {ngay_con_lai} ngày
📅 *Ngày hết hạn:* {ngay_het_han}
📎 *File đính kèm:* {link_file}`;

  async function fetchSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('telegram_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;

      if (data) {
        setBotToken(data.bot_token || '');
        setChatId(data.chat_id || '');
        setIsActive(data.is_active ?? true);
        setNotifyTime(data.notify_time || '11:35');
        setMessageTemplate(data.message_template || defaultTemplate);
      } else {
        setMessageTemplate(defaultTemplate);
      }
    } catch (err: unknown) {
      console.error('Lỗi lấy cấu hình:', err);
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- data fetching on mount */
  useEffect(() => {
    fetchSettings();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('telegram_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const payload = {
        bot_token: botToken.trim(),
        chat_id: chatId.trim(),
        is_active: isActive,
        notify_time: notifyTime,
        message_template: messageTemplate,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        // Cập nhật cấu hình hiện tại
        const { error: updateErr } = await supabase
          .from('telegram_settings')
          .update(payload)
          .eq('id', existing.id);

        if (updateErr) throw updateErr;
      } else {
        // Thêm cấu hình mới nếu trống
        const { error: insertErr } = await supabase
          .from('telegram_settings')
          .insert([payload]);

        if (insertErr) throw insertErr;
      }

      setStatusMsg({ type: 'success', text: 'Đã lưu cấu hình và thời gian gửi Telegram thành công!' });
    } catch (err: unknown) {
      // Hiển thị lỗi chính xác từ Database nếu chưa tạo cột
      const message = err instanceof Error ? err.message : 'Không thể lưu';
      setStatusMsg({ type: 'error', text: 'Lỗi khi lưu Database: ' + message });
    } finally {
      setSaving(false);
    }
  };

  // Nút gửi thử tin nhắn
  const handleTestNotification = async () => {
    if (!botToken || !chatId) {
      alert('Vui lòng nhập Bot Token và Chat ID trước khi thử nghiệm!');
      return;
    }

    setTesting(true);
    try {
      const testText = messageTemplate
        .replace(/{ten_hd}/g, 'Hợp đồng Dịch vụ CNTT mẫu')
        .replace(/{ma_hd}/g, 'HD-2026-TEST')
        .replace(/{doi_tac}/g, 'Công ty TNHH Mẫu')
        .replace(/{gia_tri}/g, '100.000.000')
        .replace(/{ngay_con_lai}/g, '7')
        .replace(/{ngay_het_han}/g, '2026-12-31')
        .replace(/{link_file}/g, 'https://example.com/sample.pdf');

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `[TIN NHẮN THỬ NGHIỆM]\n\n${testText}`,
          parse_mode: 'Markdown',
        }),
      });

      const resData = await res.json();
      if (resData.ok) {
        alert('Gửi tin nhắn thử nghiệm thành công! Hãy kiểm tra Telegram.');
      } else {
        alert('Lỗi từ Telegram API: ' + resData.description);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không xác định';
      alert('Không thể kết nối Telegram: ' + message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
          <ArrowLeft size={16} /> Quay lại Trang chủ
        </Link>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
          <Bot size={32} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cấu Hình Telegram Bot</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động quét và gửi thông báo hợp đồng sắp hết hạn
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm">Đang tải cấu hình...</div>
      ) : (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-sm font-semibold text-slate-800">Trạng thái thông báo</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bot Token *</label>
              <input
                type="text"
                required
                placeholder="123456789:ABCdefGhIJKlmNoPQ..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chat ID *</label>
              <input
                type="text"
                required
                placeholder="-100123456789 hoặc 987654321"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Ô CHỌN THỜI GIAN THÔNG BÁO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock size={14} className="text-blue-600" /> Giờ gửi thông báo hàng ngày *
              </label>
              <input
                type="time"
                required
                value={notifyTime}
                onChange={(e) => setNotifyTime(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Soạn Mẫu Câu Thông Báo */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Mẫu câu thông báo tùy biến (Hỗ trợ Markdown)
              </label>
              <button
                type="button"
                onClick={() => setMessageTemplate(defaultTemplate)}
                className="text-xs text-blue-600 hover:underline"
              >
                Khôi phục mẫu mặc định
              </button>
            </div>
            <textarea
              rows={7}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Bảng Danh Sách Từ Khóa Thay Thế */}
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <Info size={16} /> Các từ khóa tự động thay thế:
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">{'{ten_hd}'}</code>
              <span className="text-slate-600">Tên hợp đồng</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">{'{ma_hd}'}</code>
              <span className="text-slate-600">Mã hợp đồng</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">{'{doi_tac}'}</code>
              <span className="text-slate-600">Đối tác (Bên B)</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">{'{gia_tri}'}</code>
              <span className="text-slate-600">Giá trị hợp đồng</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">{'{ngay_con_lai}'}</code>
              <span className="text-slate-600">Số ngày còn lại</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">{'{ngay_het_han}'}</code>
              <span className="text-slate-600">Ngày hết hạn</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">{'{link_file}'}</code>
              <span className="text-slate-600">Link tải file hợp đồng</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testing}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <Send size={16} /> {testing ? 'Đang gửi...' : 'Gửi thử tin nhắn qua Telegram'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20"
            >
              <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}