"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bot,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function TelegramPage() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notifyTime, setNotifyTime] = useState("11:35");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testingCron, setTestingCron] = useState(false);
  const [cronTestResult, setCronTestResult] = useState<string | null>(null);

  const DEFAULT_TELEGRAM_TEMPLATE = `🚨 *CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN*

📌 *Mã HĐ:* {contract_code}
🤝 *Tên HĐ:* {title}
🏢 *Đối tác:* {partner_name}
📅 *Ngày hết hạn:* {expiration_date}
⏳ *Còn lại:* {days_left} ngày

👉 *Vui lòng kiểm tra và xử lý gia hạn!*`;

  // Khóa lưu nháp tự động vào localStorage
  const FORM_DRAFT_KEY = "form_draft_telegram_settings";
  // Bỏ qua lần render đầu để tránh ghi nháp rỗng lên localStorage trước khi DB/draft được tải
  const isFirstRender = useRef(true);

  async function fetchSettings() {
    try {
      setLoading(true);

      // 1) Đọc cấu hình Telegram động từ bảng system_settings (hiển thị lên input)
      const { data: settings, error: settingsError } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", [
          "telegram_bot_token",
          "telegram_chat_id",
          "daily_notification_time",
          "telegram_message_template",
        ]);
      if (settingsError) throw settingsError;

      const configMap: Record<string, string> = {};
      for (const row of settings ?? []) {
        configMap[row.key] = (row.value || "").trim();
      }
      setBotToken(configMap.telegram_bot_token || "");
      setChatId(configMap.telegram_chat_id || "");
      setNotifyTime(
        configMap.daily_notification_time?.trim()
          ? configMap.daily_notification_time.trim()
          : "11:35",
      );
      const templateFromSystem =
        configMap.telegram_message_template?.trim() || "";
      setMessageTemplate(templateFromSystem || DEFAULT_TELEGRAM_TEMPLATE);

      // 2) Đọc thêm tùy chọn mở rộng từ telegram_settings (nếu có) — dùng làm fallback khi system_settings thiếu
      const { data, error } = await supabase
        .from("telegram_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        setIsActive(data.is_active ?? true);
        setNotifyTime((prev) =>
          prev && prev !== "11:35" ? prev : data.notify_time || "11:35",
        );
        setMessageTemplate((prev) =>
          prev && prev !== DEFAULT_TELEGRAM_TEMPLATE
            ? prev
            : data.message_template || DEFAULT_TELEGRAM_TEMPLATE,
        );
      }

      // 3) Khôi phục nháp (draft) từ localStorage — ưu tiên hơn DB (bản nháp chưa lưu)
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(FORM_DRAFT_KEY);
          if (raw) {
            const draft = JSON.parse(raw) as Partial<{
              botToken: string;
              chatId: string;
              isActive: boolean;
              notifyTime: string;
              messageTemplate: string;
            }>;
            if (draft.botToken !== undefined) setBotToken(draft.botToken);
            if (draft.chatId !== undefined) setChatId(draft.chatId);
            if (draft.isActive !== undefined) setIsActive(draft.isActive);
            if (draft.notifyTime !== undefined && draft.notifyTime.trim() !== "")
              setNotifyTime(draft.notifyTime);
            if (
              draft.messageTemplate !== undefined &&
              draft.messageTemplate.trim() !== ""
            )
              setMessageTemplate(draft.messageTemplate);
          }
        } catch (e) {
          console.warn("[Draft] restore telegram_settings failed:", e);
        }
      }
    } catch (err: unknown) {
      console.error(
        "Lỗi lấy cấu hình:",
        err instanceof Error ? err.message : JSON.stringify(err, null, 2),
      );
      // Fallback an toàn: gán giá trị rỗng để trang không crash
      setBotToken("");
      setChatId("");
      setIsActive(true);
      setNotifyTime("11:35");
      setMessageTemplate(DEFAULT_TELEGRAM_TEMPLATE);
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- data fetching on mount */
  useEffect(() => {
    fetchSettings();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Tự động lưu các ô input vào localStorage (nháp chưa lưu) — bỏ qua lần render đầu
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const draft = {
        botToken,
        chatId,
        isActive,
        notifyTime,
        messageTemplate,
      };
      localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("[Draft] save telegram_settings failed:", e);
    }
  }, [botToken, chatId, isActive, notifyTime, messageTemplate]);

  // Ghi 1 cặp key-value vào bảng system_settings (upsert theo key)
  const upsertSystemSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("system_settings")
      .upsert(
        { key, value: value.trim(), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw error;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      // 1) Lưu cấu hình Telegram động vào system_settings
      await Promise.all([
        upsertSystemSetting("telegram_bot_token", botToken),
        upsertSystemSetting("telegram_chat_id", chatId),
        upsertSystemSetting("daily_notification_time", notifyTime),
        upsertSystemSetting("telegram_message_template", messageTemplate),
      ]);

      // 2) Lưu thêm tùy chọn mở rộng vào telegram_settings (lỗi ở phần này KHÔNG chặn lưu chính)
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from("telegram_settings")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (!fetchErr) {
          const payload = {
            bot_token: botToken.trim(),
            chat_id: chatId.trim(),
            is_active: isActive,
            notify_time: notifyTime,
            message_template: messageTemplate,
            updated_at: new Date().toISOString(),
          };

          if (existing?.id) {
            const { error: updateErr } = await supabase
              .from("telegram_settings")
              .update(payload)
              .eq("id", existing.id);
            if (updateErr) throw updateErr;
          } else {
            const { error: insertErr } = await supabase
              .from("telegram_settings")
              .insert([payload]);
            if (insertErr) throw insertErr;
          }
        }
      } catch (extErr) {
        console.warn(
          "Không lưu được tùy chọn mở rộng (telegram_settings):",
          extErr,
        );
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(FORM_DRAFT_KEY);
        } catch {}
      }
      setStatusMsg({
        type: "success",
        text: "Đã lưu cấu hình Telegram thành công!",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể lưu";
      setStatusMsg({ type: "error", text: "Lỗi khi lưu Database: " + message });
    } finally {
      setSaving(false);
    }
  };

  // Nút Kiểm tra kết nối - gửi tin nhắn test qua API route /api/telegram
  const handleTestNotification = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const testText = messageTemplate
        .replace(/{title}/g, "Hợp đồng Dịch vụ CNTT mẫu")
        .replace(/{contract_code}/g, "HD-2026-TEST")
        .replace(/{partner_name}/g, "Công ty TNHH Mẫu")
        .replace(/{expiration_date}/g, "2026-12-31")
        .replace(/{days_left}/g, "7");

      // Gửi qua API Route nội bộ (server-side) - truyền botToken & chatId vừa nhập
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[TIN NHẮN THỬ NGHIỆM]\n\n${testText}`,
          botToken,
          chatId,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (resData.ok) {
        setStatusMsg({
          type: "success",
          text: "Kết nối thành công! Đã gửi tin nhắn thử nghiệm, hãy kiểm tra Telegram.",
        });
      } else {
        setStatusMsg({
          type: "error",
          text:
            "Kiểm tra kết nối thất bại: " + (resData.error || "Không xác định"),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không xác định";
      setStatusMsg({
        type: "error",
        text: "Không thể kết nối Telegram: " + message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestCron = async () => {
    setTestingCron(true);
    setCronTestResult(null);
    try {
      const res = await fetch('/api/cron/check-expiration?force=true');
      const data = await res.json().catch(() => ({}));
      setCronTestResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không xác định';
      setCronTestResult('Lỗi: ' + message);
    } finally {
      setTestingCron(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} /> Quay lại Trang chủ
        </Link>
        <button
          onClick={handleTestCron}
          disabled={testingCron}
          className='flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-60'
        >
          <Send size={16} />
          <span>{testingCron ? 'Đang chạy...' : 'Chạy thử Cron Job ngay'}</span>
        </button>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
          <Bot size={32} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Cấu Hình Telegram Bot
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động quét và gửi thông báo hợp đồng sắp hết hạn
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {statusMsg.text}
        </div>
      )}

      {cronTestResult && (
        <div className='bg-slate-900 text-slate-50 rounded-2xl p-4 text-xs font-mono whitespace-pre-wrap'>
          {cronTestResult}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          Đang tải cấu hình...
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-6"
        >
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-sm font-semibold text-slate-800">
              Trạng thái thông báo
            </span>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bot Token *
              </label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chat ID *
              </label>
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
                <Clock size={14} className="text-blue-600" /> Giờ gửi thông báo
                hàng ngày *
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
                onClick={() => setMessageTemplate(DEFAULT_TELEGRAM_TEMPLATE)}
                className="text-xs text-blue-600 hover:underline"
              >
                Khôi phục mẫu mặc định
              </button>
            </div>
            <textarea
              rows={7}
              placeholder={DEFAULT_TELEGRAM_TEMPLATE}
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
              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">
                {"{contract_code}"}
              </code>
              <span className="text-slate-600">Mã hợp đồng</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">
                {"{title}"}
              </code>
              <span className="text-slate-600">Tên hợp đồng</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">
                {"{partner_name}"}
              </code>
              <span className="text-slate-600">Đối tác (Bên B)</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">
                {"{expiration_date}"}
              </code>
              <span className="text-slate-600">Ngày hết hạn</span>

              <code className="bg-white px-2 py-1 rounded border text-blue-800 font-semibold">
                {"{days_left}"}
              </code>
              <span className="text-slate-600">Số ngày còn lại</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testing}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <Send size={16} />{" "}
              {testing ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20"
            >
              <Save size={16} /> {saving ? "Đang lưu..." : "Lưu Cấu Hình"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
