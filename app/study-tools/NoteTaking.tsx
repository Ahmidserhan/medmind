'use client';

import { useEffect, useMemo, useState } from 'react';

interface Note { id: string; title: string; body: string; tags: string[]; ts: number }

const LS_KEY = 'medmind_notes_v1';

function load(): Note[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function save(list: Note[]) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

export default function NoteTaking() {
  const [list, setList] = useState<Note[]>(load());
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formTags, setFormTags] = useState('');

  useEffect(() => { save(list); }, [list]);

  const filtered = useMemo(() => list.filter(n => {
    const hay = (n.title + ' ' + n.body + ' ' + n.tags.join(' ')).toLowerCase();
    return hay.includes(q.toLowerCase());
  }).sort((a,b)=>b.ts-a.ts), [list, q]);

  const openForm = (existing?: Note) => {
    setEditing(existing || null);
    setFormTitle(existing?.title || '');
    setFormBody(existing?.body || '');
    setFormTags(existing?.tags.join(', ') || '');
    setShowModal(true);
  };

  const saveForm = () => {
    const title = formTitle.trim();
    if (!title) return;
    const tags = formTags.split(',').map(s=>s.trim()).filter(Boolean);
    
    if (editing) {
      setList(prev => prev.map(x => x.id===editing.id ? { ...x, title, body: formBody, tags } : x));
    } else {
      setList(prev => [{ id: crypto.randomUUID(), title, body: formBody, tags, ts: Date.now() }, ...prev]);
    }
    setShowModal(false);
  };

  const del = (id: string) => setList(prev => prev.filter(x => x.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search notes..." className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
        </div>
        <button onClick={()=>openForm()} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg font-semibold transition-all shadow-md flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(n => (
          <div key={n.id} className="p-4 border-2 border-gray-200 rounded-xl bg-white hover:border-[#0F3D73] transition-all">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="font-bold text-gray-900 text-base">{n.title}</div>
              <div className="flex gap-1.5">
                <button onClick={()=>openForm(n)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-gray-200 hover:bg-gray-50 transition-all">Edit</button>
                <button onClick={()=>del(n.id)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-all">Delete</button>
              </div>
            </div>
            {n.body && <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3 leading-relaxed">{n.body}</div>}
            <div className="flex flex-wrap items-center gap-2">
              {n.tags.length > 0 && n.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">{tag}</span>
              ))}
              <span className="ml-auto text-xs text-gray-500">{new Date(n.ts).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="text-sm text-gray-500 text-center py-8">No notes yet. Create your first note to get started!</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowModal(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-between">
              <div className="text-white font-bold text-lg">{editing ? 'Edit Note' : 'New Note'}</div>
              <button onClick={()=>setShowModal(false)} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Title <span className="text-red-500">*</span></label>
                <input
                  value={formTitle}
                  onChange={(e)=>setFormTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g., Pharmacology Notes"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Content</label>
                <textarea
                  value={formBody}
                  onChange={(e)=>setFormBody(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  placeholder="Write your notes here..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Tags</label>
                <input
                  value={formTags}
                  onChange={(e)=>setFormTags(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g., pharmacology, chapter 5, exam prep (comma separated)"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="px-5 py-2.5 rounded-xl border-2 border-gray-300 hover:bg-gray-100 font-semibold transition-all">Cancel</button>
              <button
                onClick={saveForm}
                disabled={!formTitle.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {editing ? 'Update Note' : 'Create Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
