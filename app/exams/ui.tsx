'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { getExamsByMonth, createExam, updateExam, deleteExam, type Exam } from '@/app/actions/exams';

function daysUntil(dateStr: string, time?: string | null) {
  if (!dateStr) return 0;
  const dt = new Date(`${dateStr}T${time || '00:00'}:00`);
  if (isNaN(dt.getTime())) return 0;
  const now = new Date();
  const diff = dt.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function ExamsClient() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [query] = useState('');

  const monthLabel = new Date(ym.y, ym.m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getExamsByMonth(ym.y, ym.m);
      if ('error' in res) Swal.fire({ icon: 'error', title: 'Failed to load', text: res.error });
      else setItems(res.data);
      setLoading(false);
    };
    load();
  }, [ym.y, ym.m]);

  const filtered = useMemo(() =>
    items.filter(e => {
      if (query) {
        const q = query.toLowerCase();
        return e.title.toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  , [items, query]);

  const openForm = async (existing?: Exam) => {
    const { value: formValues } = await Swal.fire<{ title: string; date: string; time?: string; location?: string; description?: string }>({
      title: existing ? 'Edit Exam' : 'New Exam',
      width: 700,
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonText: 'Save Exam',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-xl font-bold text-white',
        htmlContainer: 'px-6 py-4',
        confirmButton: 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white font-semibold shadow-md hover:shadow-lg transition-all',
        cancelButton: 'px-5 py-2.5 rounded-xl border-2 border-gray-300 hover:bg-gray-100 font-semibold transition-all mr-2',
        actions: 'gap-3 mt-6',
      },
      didOpen: () => {
        const popup = Swal.getPopup();
        if (popup) {
          const titleEl = popup.querySelector('.swal2-title');
          if (titleEl) {
            titleEl.className = 'px-6 py-5 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white font-bold text-lg rounded-t-2xl m-0';
          }
        }
      },
      html: `
        <div class="space-y-5 text-left">
          <div>
            <label for="title" class="block text-sm font-semibold text-gray-900 mb-2">
              Exam Title <span class="text-red-500">*</span>
            </label>
            <input 
              id="title" 
              type="text"
              placeholder="e.g., Pharmacology Midterm"
              value="${existing?.title || ''}"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
            >
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="date" class="block text-sm font-semibold text-gray-900 mb-2">
                Date <span class="text-red-500">*</span>
              </label>
              <input 
                id="date" 
                type="date" 
                value="${existing?.date || ''}"
                min="${new Date().toISOString().slice(0,10)}"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
              >
            </div>
            <div>
              <label for="time" class="block text-sm font-semibold text-gray-900 mb-2">
                Time
              </label>
              <input 
                id="time" 
                type="time" 
                value="${existing?.time || ''}"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
              >
            </div>
          </div>
          
          <div>
            <label for="location" class="block text-sm font-semibold text-gray-900 mb-2">
              Location
            </label>
            <div class="relative">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input 
                id="location" 
                type="text"
                placeholder="e.g., Room 301, Building A"
                value="${existing?.location || ''}"
                class="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
              >
            </div>
          </div>
          
          <div>
            <label for="description" class="block text-sm font-semibold text-gray-900 mb-2">
              Description / Notes
            </label>
            <textarea 
              id="description" 
              rows="3"
              placeholder="Add any additional details about the exam..."
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all resize-none"
            >${existing?.description || ''}</textarea>
          </div>
          
          <div class="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-xs text-blue-700">Fields marked with <span class="text-red-500">*</span> are required</span>
          </div>
        </div>
      `,
      focusConfirm: false,
      preConfirm: () => {
        const title = (document.getElementById('title') as HTMLInputElement).value.trim();
        const date = (document.getElementById('date') as HTMLInputElement).value;
        if (!title || !date) { 
          Swal.showValidationMessage('Please fill in all required fields'); 
          return; 
        }
        return {
          title,
          date,
          time: (document.getElementById('time') as HTMLInputElement).value,
          location: (document.getElementById('location') as HTMLInputElement).value,
          description: (document.getElementById('description') as HTMLTextAreaElement).value,
        };
      }
    });

    if (!formValues) return;
    const fd = new FormData();
    Object.entries(formValues).forEach(([k,v]) => fd.append(k, String(v)));

    Swal.fire({ title: existing ? 'Updating' : 'Creating', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = existing ? await updateExam(existing.id, fd) : await createExam(fd);
    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    } else {
      Swal.close();
      setItems(prev => existing ? prev.map(x => x.id === res.data.id ? res.data : x) : [...prev, res.data]);
    }
  };

  const confirmDelete = async (id: string) => {
    const ok = await Swal.fire({ icon: 'warning', title: 'Delete exam?', showCancelButton: true, confirmButtonText: 'Delete' });
    if (!ok.isConfirmed) return;
    const res = await deleteExam(id);
    if ('error' in res) return Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    setItems(prev => prev.filter(x => x.id !== id));
  };

  const prevMonth = () => setYm(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const nextMonth = () => setYm(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });

  if (loading) return (
    <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center shadow-lg">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#0F3D73] mb-4"></div>
      <div className="text-gray-600 font-medium">Loading exams...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#0F3D73] mb-1">{monthLabel}</div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {filtered.length} {filtered.length === 1 ? 'exam' : 'exams'} scheduled
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-[#0F3D73] shadow-sm transition-all font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <button onClick={nextMonth} className="px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-[#0F3D73] shadow-sm transition-all font-medium flex items-center gap-2">
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => openForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0F3D73] via-[#1a4d7f] to-[#2E3A59] text-white shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Exam
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-white border border-gray-200 rounded-2xl text-center shadow-lg">
          <div className="inline-block p-4 bg-gradient-to-br from-[#EAF2FB] to-[#D6E8F9] rounded-full mb-4">
            <svg className="w-12 h-12 text-[#0F3D73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div className="text-xl font-bold text-gray-900 mb-2">No exams scheduled</div>
          <div className="text-sm text-gray-600 mb-6">Add your first exam to start tracking your preparation time.</div>
          <button onClick={() => openForm()} className="px-6 py-3 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Exam
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(e => {
            const days = daysUntil(e.date, e.time);
            const isUrgent = days <= 3;
            const isPast = days < 0;
            return (
              <div key={e.id} className="group relative bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <span className={`absolute inset-x-0 -top-0.5 h-1 rounded-t-2xl bg-gradient-to-r ${isPast ? 'from-gray-400 to-gray-500' : isUrgent ? 'from-red-400 via-red-500 to-red-600' : 'from-blue-400 via-blue-500 to-blue-600'} opacity-80 group-hover:opacity-100 transition-opacity`}></span>
                
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#EAF2FB] to-[#D6E8F9] flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#0F3D73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#0F3D73] text-lg mb-2">{e.title}</div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">{new Date(e.date).toLocaleDateString()}</span>
                          </div>
                          {e.time && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{e.time}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {e.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{e.location}</span>
                      </div>
                    )}
                    
                    {e.description && (
                      <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg leading-relaxed">{e.description}</div>
                    )}
                  </div>
                  
                  <div className="flex lg:flex-col items-center lg:items-end gap-3">
                    <div className={`px-4 py-2 rounded-xl text-center ${isPast ? 'bg-gray-100 border border-gray-300' : isUrgent ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'}`}>
                      <div className={`text-2xl font-bold ${isPast ? 'text-gray-600' : isUrgent ? 'text-red-600' : 'text-blue-600'}`}>{Math.abs(days)}</div>
                      <div className={`text-xs font-semibold ${isPast ? 'text-gray-500' : isUrgent ? 'text-red-600' : 'text-blue-600'}`}>{isPast ? 'days ago' : 'days left'}</div>
                    </div>
                    
                    <div className="flex lg:flex-col gap-2">
                      <button onClick={() => openForm(e)} className="px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#0F3D73] font-semibold text-sm transition-all shadow-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button onClick={() => confirmDelete(e.id)} className="px-4 py-2 rounded-xl border-2 border-red-200 bg-white hover:bg-red-50 hover:border-red-300 font-semibold text-sm text-red-600 transition-all shadow-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
