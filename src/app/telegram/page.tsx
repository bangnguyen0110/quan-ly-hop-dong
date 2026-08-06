"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Save, Send, CheckCircle, XCircle, X } from "lucide-react";

interface TelegramSettings {
  id?: string; // Supabase will auto-generate if not provided
  bot_token: string;
  chat_id: string;
  is_active: boolean;
}

export default function TelegramPage() {
  const [settings, setSettings] = useState<TelegramSettings>({
    bot_token: "",
    chat_id: "",
    is_active: false,
  });
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

  
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setFeedbackMessage(null);
    setFeedbackType(null);
    try {
      const { data, error } = await supabase
        .from("telegram_settings")
        .select("*")
        .single(); // Assuming only one row for settings

      if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
        throw error;
      }
      if (data) {
        setSettings(data);
      }
    } catch (err: any) {
      setFeedbackMessage(err.message || "Failed to fetch settings.");
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  };

    const handleSaveSettings = async () => {
    setLoading(true);
    setFeedbackMessage(null);
    setFeedbackType(null);
    try {
      const { data, error } = await supabase
        .from("telegram_settings")
        .upsert({
          id: settings.id, // Include ID for update, will be ignored for new insert
          bot_token: settings.bot_token,
          chat_id: settings.chat_id,
          is_active: settings.is_active,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      setFeedbackMessage("Cấu hình Telegram đã được lưu thành công!");
      setFeedbackType("success");
    } catch (err: any) {
      setFeedbackMessage(err.message || "Lưu cấu hình thất bại.");
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!settings.bot_token || !settings.chat_id) {
      setFeedbackMessage("Vui lòng nhập Bot Token và Chat ID trước.");
      setFeedbackType("error");
      return;
    }

    setLoading(true);
    setFeedbackMessage(null);
    setFeedbackType(null);
    try {
      const message = "Tin nhắn kiểm tra từ CONTRACT AI!";
      const response = await fetch(
        `https://api.telegram.org/bot${settings.bot_token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: settings.chat_id,
            text: message,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.description || "Không thể gửi tin nhắn thử.");
      }

      setFeedbackMessage("Tin nhắn thử đã được gửi thành công!");
      setFeedbackType("success");
    } catch (err: any) {
      setFeedbackMessage(err.message || "Gửi tin nhắn thử thất bại.");
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Đang tải cấu hình...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Cấu hình Telegram Bot</h1>
      </header>

      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-4 mb-6 rounded-lg shadow-md ${feedbackType === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          role="alert"
        >
          <div className="flex items-center space-x-3">
            {feedbackType === "success" ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <XCircle className="w-6 h-6" />
            )}
            <p className="font-medium">{feedbackMessage}</p>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-current hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100 max-w-2xl mx-auto">
        <div className="mb-4">
          <label
            htmlFor="bot_token"
            className="block text-gray-700 text-sm font-semibold mb-2"
          >
            Bot Token
          </label>
          <input
            type="text"
            id="bot_token"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.bot_token}
            onChange={(e) =>
              setSettings({ ...settings, bot_token: e.target.value })
            }
            placeholder="Nhập Bot Token của bạn"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="chat_id"
            className="block text-gray-700 text-sm font-semibold mb-2"
          >
            Chat ID
          </label>
          <input
            type="text"
            id="chat_id"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.chat_id}
            onChange={(e) =>
              setSettings({ ...settings, chat_id: e.target.value })
            }
            placeholder="Nhập Chat ID của bạn"
          />
        </div>

        <div className="mb-6 flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={settings.is_active}
            onChange={(e) =>
              setSettings({ ...settings, is_active: e.target.checked })
            }
          />
          <label htmlFor="is_active" className="text-gray-700 text-sm font-semibold">
            Kích hoạt Bot
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleSendTestMessage}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            <span>Gửi Tin Nhắn Thử</span>
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>Lưu Cấu Hình</span>
          </button>
        </div>
      </div>
    </div>
  );
}