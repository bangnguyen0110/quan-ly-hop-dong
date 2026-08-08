'use client';

import { useState, useEffect } from 'react';
import { ContractTemplate, FieldDefinition } from '@/types/database';
import { X, Trash2, Sparkles } from 'lucide-react';

interface TemplateModalProps {
  show: boolean;
  onClose: () => void;
  editObj: ContractTemplate | null;
  onSubmit: (data: { name: string; google_doc_id: string; apps_script_url?: string; field_definitions: FieldDefinition[] }) => Promise<void>;
}

export default function TemplateModal({ show, onClose, editObj, onSubmit }: TemplateModalProps) {
  const [name, setName] = useState('');
  const [docId, setDocId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [k, setK] = useState('');
  const [l, setL] = useState('');
  const [t, setT] = useState<'text' | 'number' | 'date'>('text');

  /* eslint-disable react-hooks/set-state-in-effect -- sync form when the record being edited changes */
  useEffect(() => {
    if (editObj) {
      setName(editObj.name || ''); setDocId(editObj.google_doc_id || '');
      setScriptUrl(editObj.apps_script_url || ''); setFields(editObj.field_definitions || []);
    } else {
      setName(''); setDocId(''); setScriptUrl(''); setFields([]);
    }
  }, [editObj, show]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!show) return null;

  const addField = () => {
    if (!k.trim() || !l.trim()) return;
    const key = k.trim().toLowerCase().replace(/\s+/g, '_');
    if (fields.some(f => f.key === key)) return;
    setFields([...fields, { key, label: l.trim(), type: t }]);
    setK(''); setL('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !docId.trim()) return;
    await onSubmit({ name: name.trim(), google_doc_id: docId.trim(), apps_script_url: scriptUrl.trim() || undefined, field_definitions: fields });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-3 shrink-0">
          <h2 className="text-lg font-bold">{editObj ? 'Sửa Mẫu' : 'Thêm Mẫu'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold">Tên mẫu <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold">Doc ID <span className="text-red-500">*</span></label>
              <input type="text" value={docId} onChange={e => setDocId(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm font-mono" required />
            </div>
            <div>
              <label className="block text-xs font-semibold">Apps Script URL</label>
              <input type="url" value={scriptUrl} onChange={e => setScriptUrl(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm font-mono" />
            </div>
          </div>
          <div className="border-t pt-3 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5 uppercase"><Sparkles size={14} /> Trường Tùy Chỉnh</h3>
            <div className="bg-slate-50 p-2 rounded-xl border grid grid-cols-3 gap-2">
              <input type="text" value={k} onChange={e => setK(e.target.value)} placeholder="Key" className="px-2 border rounded-lg text-xs font-mono" />
              <input type="text" value={l} onChange={e => setL(e.target.value)} placeholder="Label" className="px-2 border rounded-lg text-xs" />
              <div className="flex gap-1">
                <select value={t} onChange={e => setT(e.target.value as 'text' | 'number' | 'date')} className="px-1 border rounded-lg text-xs"><option value="text">T</option><option value="number">N</option><option value="date">D</option></select>
                <button type="button" onClick={addField} className="bg-slate-900 text-white px-2 rounded-lg text-xs">+</button>
              </div>
            </div>
            {fields.map((f, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs">
                <span>{`{{${f.key}}}`} - {f.label}</span>
                <button type="button" onClick={() => setFields(fields.filter((_, idx) => idx !== i))} className="text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-medium">Lưu</button>
        </form>
      </div>
    </div>
  );
}
