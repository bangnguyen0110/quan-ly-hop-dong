"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit, Trash2, X } from "lucide-react";

interface ContractTemplate {
  id: string;
  title: string;
  content: string;
  category_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplatesAndCategories();
  }, []);
  
  const fetchTemplatesAndCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from("contract_templates")
        .select("*");
      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*");
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTitle("");
    setContent("");
    setCategoryId(categories.length > 0 ? categories[0].id : "");
    setShowModal(true);
  };

  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setTitle(template.title);
    setContent(template.content);
    setCategoryId(template.category_id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mẫu hợp đồng này?")) return;
    setError(null);
    try {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      fetchTemplatesAndCategories(); // Re-fetch data
    } catch (err: any) {
      setError(err.message || "Failed to delete template.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !content || !categoryId) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from("contract_templates")
          .update({ title, content, category_id: categoryId })
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        // Add new template
        const { error } = await supabase
          .from("contract_templates")
          .insert([{ title, content, category_id: categoryId }]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchTemplatesAndCategories(); // Re-fetch data
    } catch (err: any) {
      setError(err.message || "Failed to save template.");
    }
  };
    if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Hợp Đồng Mẫu</h1>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition duration-300 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Tạo Mẫu Mới</span>
        </button>
      </header>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <X className="w-4 h-4 cursor-pointer" />
          </span>
        </div>
      )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white shadow-sm rounded-xl p-6 border border-gray-100 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {template.title}
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                Danh mục:{" "}
                {categories.find((cat) => cat.id === template.category_id)?.name ||
                  "N/A"}
              </p>
              <p className="text-gray-700 text-sm line-clamp-3 mb-4">
                {template.content}
              </p>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => handleEdit(template)}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition duration-300"
              >
                <Edit className="w-4 h-4" />
                <span>Sửa</span>
              </button>
              <button
                onClick={() => handleDelete(template.id)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition duration-300"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingTemplate ? "Sửa Mẫu Hợp Đồng" : "Thêm Mẫu Hợp Đồng"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="title"
                  className="block text-gray-700 text-sm font-semibold mb-2"
                >
                  Tiêu đề mẫu
                </label>
                <input
                  type="text"
                  id="title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="category"
                  className="block text-gray-700 text-sm font-semibold mb-2"
                >
                  Chọn Danh mục
                </label>
                <select
                  id="category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="content"
                  className="block text-gray-700 text-sm font-semibold mb-2"
                >
                  Nội dung văn bản
                </label>
                <textarea
                  id="content"
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Sử dụng {{ten_bien}} để làm trường dữ liệu động"
                  required
                ></textarea>
                <p className="text-sm text-gray-500 mt-1">
                  {"Sử dụng `{{ten_bien}}` để làm trường dữ liệu động (ví dụ: `{{ten_khach_hang}}`)."}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-300"
                >
                  {editingTemplate ? "Lưu Thay Đổi" : "Tạo Mẫu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}