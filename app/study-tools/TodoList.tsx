'use client';

import { useEffect, useMemo, useState } from 'react';

type Status = 'pending' | 'in_progress' | 'completed';
interface Task { id: string; title: string; status: Status; priority: 'low'|'medium'|'high'; notes?: string; ts: number }

const LS_KEY = 'medmind_todos_v1';

function load(): Task[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function save(list: Task[]) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

export default function TodoList() {
  const [list, setList] = useState<Task[]>(load());
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all'|Status>('all');
  const [priority, setPriority] = useState<'all'|'low'|'medium'|'high'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPriority, setFormPriority] = useState<'low'|'medium'|'high'>('medium');
  const [formStatus, setFormStatus] = useState<Status>('pending');

  useEffect(() => { save(list); }, [list]);

  const filtered = useMemo(() => list.filter(t =>
    (filter === 'all' || t.status === filter) &&
    (priority === 'all' || t.priority === priority) &&
    (!q || t.title.toLowerCase().includes(q.toLowerCase()) || (t.notes||'').toLowerCase().includes(q.toLowerCase()))
  ).sort((a,b)=>b.ts-a.ts), [list, q, filter, priority]);

  const openForm = (existing?: Task) => {
    setEditing(existing || null);
    setFormTitle(existing?.title || '');
    setFormNotes(existing?.notes || '');
    setFormPriority(existing?.priority || 'medium');
    setFormStatus(existing?.status || 'pending');
    setShowModal(true);
  };

  const saveForm = () => {
    const title = formTitle.trim();
    if (!title) return;
    
    if (editing) {
      setList(prev => prev.map(x => x.id===editing.id ? { ...x, title, notes: formNotes, priority: formPriority, status: formStatus } : x));
    } else {
      setList(prev => [{ id: crypto.randomUUID(), title, status: formStatus, priority: formPriority, notes: formNotes, ts: Date.now() }, ...prev]);
    }
    setShowModal(false);
  };

  const toggle = (id: string) => setList(prev => prev.map(t => t.id===id ? { ...t, status: t.status==='completed' ? 'pending':'completed' } : t));
  const del = (id: string) => setList(prev => prev.filter(x => x.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tasks..." className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
        </div>
        <select value={filter} onChange={e=>setFilter(e.target.value as ('all'|Status))} className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white font-medium transition-all">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select value={priority} onChange={e=>setPriority(e.target.value as ('all'|'low'|'medium'|'high'))} className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white font-medium transition-all">
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button onClick={()=>openForm()} className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg font-semibold transition-all shadow-md flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(t => (
          <div key={t.id} className={`p-4 border-2 rounded-xl transition-all ${t.status==='completed'?'bg-gray-50 border-gray-200':'bg-white border-gray-200 hover:border-[#0F3D73]'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`font-semibold text-gray-900 ${t.status==='completed'?'line-through text-gray-500':''}`}>{t.title}</div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${t.priority==='high'?'bg-red-100 text-red-700':t.priority==='medium'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{t.priority}</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${t.status==='completed'?'bg-gray-100 text-gray-600':t.status==='in_progress'?'bg-blue-100 text-blue-700':'bg-orange-100 text-orange-700'}`}>{t.status.replace('_',' ')}</span>
                </div>
                {t.notes && <div className="text-sm text-gray-600 mb-2">{t.notes}</div>}
                <div className="text-xs text-gray-500">{new Date(t.ts).toLocaleString()}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5">
                <button onClick={()=>toggle(t.id)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${t.status==='completed'?'border-2 border-gray-300 hover:bg-gray-100':'bg-green-50 border-2 border-green-200 text-green-700 hover:bg-green-100'}`}>
                  {t.status==='completed'?'Undo':'Done'}
                </button>
                <button onClick={()=>openForm(t)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-gray-200 hover:bg-gray-50 transition-all">Edit</button>
                <button onClick={()=>del(t.id)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-all">Del</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="text-sm text-gray-500 text-center py-8">No tasks found. Add your first task to get started!</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowModal(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-between">
              <div className="text-white font-bold text-lg">{editing ? 'Edit Task' : 'New Task'}</div>
              <button onClick={()=>setShowModal(false)} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Task Title <span className="text-red-500">*</span></label>
                <input
                  value={formTitle}
                  onChange={(e)=>setFormTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  placeholder="e.g., Review Chapter 5"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e)=>setFormPriority(e.target.value as 'low'|'medium'|'high')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e)=>setFormStatus(e.target.value as Status)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e)=>setFormNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none"
                  placeholder="Add any additional details..."
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="px-5 py-2.5 rounded-xl border-2 border-gray-300 hover:bg-gray-100 font-semibold transition-all">Cancel</button>
              <button
                onClick={saveForm}
                disabled={!formTitle.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {editing ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
