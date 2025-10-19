'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  setAssignmentStatus,
  type Assignment,
  type AssignmentPriority,
  type AssignmentStatus,
} from '@/app/actions/assignments';

const priorityColors: Record<AssignmentPriority, string> = {
  low: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
  medium: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  high: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]',
};

function dueMeta(due: string) {
  const d = new Date(due);
  const today = new Date();
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (dOnly < tOnly) return { label: 'Overdue', cls: 'text-[#991B1B] bg-[#FEE2E2]' };
  if (dOnly.getTime() === tOnly.getTime()) return { label: 'Today', cls: 'text-[#92400E] bg-[#FEF3C7]' };
  return { label: d.toLocaleDateString(), cls: 'text-[#1F2937] bg-[#E5E7EB]' };
}

export default function AssignmentsClient() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | AssignmentPriority>('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formStatus, setFormStatus] = useState<AssignmentStatus>('pending');
  const [formPriority, setFormPriority] = useState<AssignmentPriority>('medium');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getAssignments();
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Failed to load', text: res.error });
      } else {
        setItems(res.data);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() =>
    items.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          (a.notes || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a,b) => a.due_date.localeCompare(b.due_date))
  , [items, statusFilter, priorityFilter, query]);

  const openForm = (existing?: Assignment) => {
    setEditing(existing || null);
    setFormTitle(existing?.title || '');
    setFormDue(existing?.due_date || new Date().toISOString().slice(0,10));
    setFormStatus((existing?.status as AssignmentStatus) || 'pending');
    setFormPriority((existing?.priority as AssignmentPriority) || 'medium');
    setFormNotes(existing?.notes || '');
    setShowModal(true);
  };

  const saveForm = async () => {
    const title = formTitle.trim();
    if (!title || !formDue) return;
    setSaving(true);
    const form = new FormData();
    form.append('title', title);
    form.append('due_date', formDue);
    form.append('status', formStatus);
    form.append('priority', formPriority);
    form.append('notes', formNotes);
    const res = editing ? await updateAssignment(editing.id, form) : await createAssignment(form);
    setSaving(false);
    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      return;
    }
    setItems(prev => editing ? prev.map(i => i.id === res.data.id ? res.data : i) : [...prev, res.data]);
    setShowModal(false);
  };

  const confirmDelete = async (id: string) => {
    const ok = await Swal.fire({ icon: 'warning', title: 'Delete assignment?', showCancelButton: true, confirmButtonText: 'Delete' });
    if (!ok.isConfirmed) return;
    const res = await deleteAssignment(id);
    if ('error' in res) return Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleStatus = async (a: Assignment) => {
    const next: AssignmentStatus = a.status === 'completed' ? 'pending' : 'completed';
    const res = await setAssignmentStatus(a.id, next);
    if ('error' in res) return Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    setItems(prev => prev.map(i => i.id === a.id ? { ...i, status: next } : i));
    await Swal.fire({
      icon: 'success',
      title: next === 'completed' ? 'Marked as Done' : 'Marked as Not Started',
      timer: 1200,
      position: 'top-end',
      showConfirmButton: false,
      toast: true,
    });
  };

  if (loading) return (
    <div className="space-y-3">
      {Array.from({length:5}).map((_,i)=> (
        <div key={i} className="h-20 rounded-xl bg-white border border-[#E5E7EB] overflow-hidden">
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-[#F3F4F6] via-[#E5E7EB] to-[#F3F4F6] bg-[length:200%_100%]"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Search by title or notes..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              {k:'all', label:'All'},
              {k:'pending', label:'Pending'},
              {k:'in_progress', label:'In Progress'},
              {k:'completed', label:'Completed'},
            ].map(s=> (
              <button key={s.k} onClick={()=>setStatusFilter(s.k as 'all' | AssignmentStatus)} className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter===s.k? 'bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] text-[#0F3D73] shadow-sm' : 'text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>{s.label}</button>
            ))}
            <div className="w-px h-6 bg-gray-300"></div>
            {[
              {k:'all', label:'All'},
              {k:'low', label:'Low'},
              {k:'medium', label:'Medium'},
              {k:'high', label:'High'},
            ].map(p=> (
              <button key={p.k} onClick={()=>setPriorityFilter(p.k as 'all' | AssignmentPriority)} className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${priorityFilter===p.k? 'bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] text-[#0F3D73] shadow-sm' : 'text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>{p.label}</button>
            ))}
            <button onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setQuery(''); }} className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-all">Clear</button>
            <button onClick={() => openForm()} className="px-5 py-2.5 bg-gradient-to-r from-[#0F3D73] via-[#1a4d7f] to-[#2E3A59] text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-white border border-gray-200 rounded-2xl text-center shadow-lg">
          <div className="inline-block p-4 bg-gradient-to-br from-[#EAF2FB] to-[#D6E8F9] rounded-full mb-4">
            <svg className="w-12 h-12 text-[#0F3D73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-xl font-bold text-gray-900 mb-2">No assignments found</div>
          <div className="text-sm text-gray-600 mb-6">Create your first assignment to get started tracking your coursework.</div>
          <button onClick={()=>openForm()} className="px-6 py-3 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map(a => {
            const due = dueMeta(a.due_date);
            return (
              <div key={a.id} className="group relative rounded-2xl bg-white border border-gray-200 hover:shadow-xl transition-all duration-300">
                <span className="absolute inset-x-0 -top-0.5 h-1 rounded-t-2xl bg-gradient-to-r from-[#3AAFA9] via-[#0F3D73] to-[#3AAFA9] opacity-80 group-hover:opacity-100 transition-opacity"></span>
                <div className="p-5">
                  <div className="min-w-0 pr-24">
                    <div className="text-[#0F3D73] font-bold text-base truncate mb-2">{a.title}</div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${priorityColors[a.priority]}`}>{a.priority}</span>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${due.cls}`}>{due.label}</span>
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700">{a.status.replace('_',' ')}</span>
                    </div>
                  </div>
                  <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => openForm(a)}
                      className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 hover:border-[#0F3D73] focus:outline-none focus:ring-2 focus:ring-[#0F3D73] shadow-sm transition-all"
                      aria-label="Edit assignment"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-700">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L7.5 20.213 3 21l.787-4.5L16.862 4.487z" />
                      </svg>
                      <span className="sr-only">Edit</span>
                    </button>
                    <button
                      onClick={() => confirmDelete(a.id)}
                      className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-300 shadow-sm transition-all"
                      aria-label="Delete assignment"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" />
                      </svg>
                      <span className="sr-only">Delete</span>
                    </button>
                  </div>
                  {a.notes && <div className="mt-4 text-sm text-gray-700 line-clamp-3 leading-relaxed">{a.notes}</div>}
                </div>
                <div className="px-5 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(a.due_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status !== 'completed' && (
                      <button onClick={() => toggleStatus(a)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] text-[#0F3D73] hover:from-[#D6E8F9] hover:to-[#C2DDF7] transition-all shadow-sm">Mark Done</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowModal(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] flex items-center justify-between">
              <div className="text-white font-bold text-lg">{editing ? 'Edit Assignment' : 'New Assignment'}</div>
              <button onClick={()=>setShowModal(false)} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Title</label>
                <input
                  value={formTitle}
                  onChange={(e)=>setFormTitle(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${formTitle.trim()? 'border-gray-200 focus:ring-[#0F3D73] focus:border-[#0F3D73]':'border-red-300 focus:ring-red-400'}`}
                  placeholder="e.g., Case write-up"
                  autoFocus
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Due date</label>
                  <input
                    type="date"
                    value={formDue}
                    min={new Date().toISOString().slice(0,10)}
                    onChange={(e)=>setFormDue(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${formDue? 'border-gray-200 focus:ring-[#0F3D73] focus:border-[#0F3D73]':'border-red-300 focus:ring-red-400'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e)=>setFormStatus(e.target.value as AssignmentStatus)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e)=>setFormPriority(e.target.value as AssignmentPriority)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e)=>setFormNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
                  placeholder="Add any additional notes or details..."
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="px-5 py-2.5 rounded-xl border-2 border-gray-300 hover:bg-gray-100 font-semibold transition-all">Cancel</button>
              <button
                onClick={saveForm}
                disabled={saving || !formTitle.trim() || !formDue}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {saving ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

