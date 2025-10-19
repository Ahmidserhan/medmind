'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  getPreceptors,
  getShiftsByMonth,
  createPreceptor,
  createShift,
  updateShift,
  deleteShift,
  type Preceptor,
  type ClinicalShift,
  type ShiftType,
} from '@/app/actions/clinicals';

const shiftColors: Record<ShiftType, string> = {
  AM: 'bg-blue-100 text-blue-800 border-blue-200',
  PM: 'bg-orange-100 text-orange-800 border-orange-200',
  Night: 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function ClinicalsClient() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [preceptors, setPreceptors] = useState<Preceptor[]>([]);
  const [items, setItems] = useState<(ClinicalShift & { preceptor?: Preceptor })[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState<'all' | string>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | ShiftType>('all');
  const [query, setQuery] = useState('');

  const monthLabel = new Date(ym.y, ym.m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [p, s] = await Promise.all([
        getPreceptors(),
        getShiftsByMonth(ym.y, ym.m),
      ]);
      if ('error' in p) Swal.fire({ icon: 'error', title: 'Failed to load preceptors', text: p.error });
      else setPreceptors(p.data);
      if ('error' in s) Swal.fire({ icon: 'error', title: 'Failed to load shifts', text: s.error });
      else setItems(s.data);
      setLoading(false);
    };
    load();
  }, [ym.y, ym.m]);

  const sites = useMemo(() => Array.from(new Set(items.map(i => i.site))), [items]);

  const filtered = useMemo(() =>
    items.filter(i => {
      if (siteFilter !== 'all' && i.site !== siteFilter) return false;
      if (shiftFilter !== 'all' && i.shift_type !== shiftFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          i.site.toLowerCase().includes(q) ||
          i.department.toLowerCase().includes(q) ||
          (i.preceptor?.name || '').toLowerCase().includes(q) ||
          (i.notes || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a,b) => b.date.localeCompare(a.date))
  , [items, siteFilter, shiftFilter, query]);

  const ensurePreceptor = async () => {
    if (preceptors.length > 0) return preceptors[0].id;
    const { value: values } = await Swal.fire<{ name: string; title?: string; email?: string; phone?: string }>({
      title: 'Create Preceptor',
      width: 640,
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'bg-[#3AAFA9] hover:bg-[#2E8B85] text-white px-4 py-2 rounded-lg',
        cancelButton: 'px-4 py-2 rounded-lg border border-[#D1D5DB] text-[#374151] ml-2',
      },
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label for="name" class="block text-sm font-medium text-[#374151] mb-1">Full name <span class="text-red-500">*</span></label>
            <input id="name" type="text" placeholder="e.g., Dr. Alex Morgan" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
          </div>
          <div>
            <label for="title" class="block text-sm font-medium text-[#374151] mb-1">Title</label>
            <input id="title" type="text" placeholder="e.g., MD, RN, PA" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="email" class="block text-sm font-medium text-[#374151] mb-1">Email</label>
              <input id="email" type="email" placeholder="name@example.com" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
            </div>
            <div>
              <label for="phone" class="block text-sm font-medium text-[#374151] mb-1">Phone</label>
              <input id="phone" type="tel" placeholder="(555) 000-0000" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
            </div>
          </div>
        </div>
      `,
      preConfirm: () => {
        const name = (document.getElementById('name') as HTMLInputElement).value.trim();
        if (!name) { Swal.showValidationMessage('Name is required'); return; }
        const email = (document.getElementById('email') as HTMLInputElement).value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Swal.showValidationMessage('Please enter a valid email'); return; }
        return {
          name,
          title: (document.getElementById('title') as HTMLInputElement).value,
          email,
          phone: (document.getElementById('phone') as HTMLInputElement).value,
        };
      }
    });
    if (!values) return null;
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, String(v)));
    const res = await createPreceptor(fd);
    if ('error' in res) { Swal.fire({ icon: 'error', title: 'Error', text: res.error }); return null; }
    setPreceptors(p => [...p, res.data]);
    return res.data.id;
  };

  const openForm = async (existing?: ClinicalShift & { preceptor?: Preceptor }) => {
    const preceptorId = existing?.preceptor_id || await ensurePreceptor();
    if (!preceptorId) return;

    const { value: formValues } = await Swal.fire<{
      date: string;
      shift_type: ShiftType;
      start_time: string;
      end_time: string;
      site: string;
      department?: string;
      hours_logged: string;
      notes?: string;
      preceptor_id: string;
    }>({
      title: existing ? 'Edit Shift' : 'New Shift',
      width: 700,
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'bg-[#3AAFA9] hover:bg-[#2E8B85] text-white px-4 py-2 rounded-lg',
        cancelButton: 'px-4 py-2 rounded-lg border border-[#D1D5DB] text-[#374151] ml-2',
      },
      html: `
        <div class="space-y-4 text-left">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="date" class="block text-sm font-medium text-[#374151] mb-1">Date <span class="text-red-500">*</span></label>
              <input id="date" type="date" value="${existing?.date || ''}" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
            </div>
            <div>
              <label for="shift_type" class="block text-sm font-medium text-[#374151] mb-1">Shift</label>
              <select id="shift_type" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]">
                ${(['AM','PM','Night'] as ShiftType[]).map(s => `<option ${existing?.shift_type===s?'selected':''} value="${s}">${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="start_time" class="block text-sm font-medium text-[#374151] mb-1">Start</label>
              <input id="start_time" type="time" value="${existing?.start_time || ''}" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
            </div>
            <div>
              <label for="end_time" class="block text-sm font-medium text-[#374151] mb-1">End</label>
              <input id="end_time" type="time" value="${existing?.end_time || ''}" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
            </div>
          </div>
          <div>
            <label for="site" class="block text-sm font-medium text-[#374151] mb-1">Site <span class="text-red-500">*</span></label>
            <input id="site" type="text" placeholder="e.g., Mercy General" value="${existing?.site || ''}" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
          </div>
          <div>
            <label for="department" class="block text-sm font-medium text-[#374151] mb-1">Department</label>
            <input id="department" type="text" placeholder="e.g., Emergency" value="${existing?.department || ''}" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
          </div>
          <div>
            <label for="hours_logged" class="block text-sm font-medium text-[#374151] mb-1">Hours Logged</label>
            <input id="hours_logged" type="number" min="1" max="24" step="1" value="${existing?.hours_logged ?? 8}" class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]" />
            <p class="text-xs text-[#6B7280] mt-1">Enter the total hours for this shift (1-24).</p>
          </div>
          <div>
            <label for="notes" class="block text-sm font-medium text-[#374151] mb-1">Notes</label>
            <textarea id="notes" rows="3" placeholder="Optional notes..." class="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]">${existing?.notes || ''}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      preConfirm: () => {
        const date = (document.getElementById('date') as HTMLInputElement).value;
        const site = (document.getElementById('site') as HTMLInputElement).value.trim();
        const start = (document.getElementById('start_time') as HTMLInputElement).value;
        const end = (document.getElementById('end_time') as HTMLInputElement).value;
        const hoursVal = (document.getElementById('hours_logged') as HTMLInputElement).value;
        if (!date || !site) { Swal.showValidationMessage('Date and site are required'); return; }
        if (start && end && start >= end) { Swal.showValidationMessage('End time must be after start time'); return; }
        const hours = parseInt(hoursVal, 10);
        if (Number.isNaN(hours) || hours < 1 || hours > 24) { Swal.showValidationMessage('Hours must be between 1 and 24'); return; }
        return {
          date,
          shift_type: (document.getElementById('shift_type') as HTMLSelectElement).value as ShiftType,
          start_time: start,
          end_time: end,
          site,
          department: (document.getElementById('department') as HTMLInputElement).value,
          hours_logged: String(hours),
          notes: (document.getElementById('notes') as HTMLTextAreaElement).value,
          preceptor_id: preceptorId,
        };
      }
    });

    if (!formValues) return;

    const fd = new FormData();
    Object.entries(formValues).forEach(([k, v]) => fd.append(k, String(v)));

    Swal.fire({ title: existing ? 'Updating' : 'Creating', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = existing ? await updateShift(existing.id, fd) : await createShift(fd);
    if ('error' in res) Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    else {
      Swal.close();
      setItems(prev => existing ? prev.map(i => i.id === res.data.id ? res.data : i) : [res.data, ...prev]);
    }
  };

  const confirmDelete = async (id: string) => {
    const ok = await Swal.fire({ icon: 'warning', title: 'Delete shift?', showCancelButton: true, confirmButtonText: 'Delete' });
    if (!ok.isConfirmed) return;
    const res = await deleteShift(id);
    if ('error' in res) return Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const prevMonth = () => setYm(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const nextMonth = () => setYm(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });

  if (loading) return (
    <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center shadow-lg">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#0F3D73] mb-4"></div>
      <div className="text-gray-600 font-medium">Loading shifts...</div>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Total hours: {filtered.reduce((sum, s) => sum + (s.hours_logged || 0), 0)}h
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
              New Shift
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Search site, department, preceptor, notes..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white font-medium transition-all" value={siteFilter} onChange={(e)=> setSiteFilter(e.target.value)}>
              <option value="all">All Sites</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white font-medium transition-all" value={shiftFilter} onChange={(e)=> setShiftFilter(e.target.value as ('all'|ShiftType))}>
              <option value="all">All Shifts</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
              <option value="Night">Night</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filtered.map(s => (
          <div
            key={s.id}
            className="group relative bg-white border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <span className={`absolute inset-x-0 -top-0.5 h-1 rounded-t-2xl bg-gradient-to-r ${s.shift_type==='AM'?'from-blue-400 via-blue-500 to-blue-600':s.shift_type==='PM'?'from-orange-400 via-orange-500 to-orange-600':'from-purple-400 via-purple-500 to-purple-600'} opacity-80 group-hover:opacity-100 transition-opacity`}></span>
            <div className="flex flex-wrap items-center gap-2 mb-3 pr-24">
              <div className="font-bold text-[#0F3D73] text-base truncate" title={s.site}>{s.site}</div>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${shiftColors[s.shift_type]}`}>{s.shift_type}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">{new Date(s.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{s.start_time} - {s.end_time} ({s.hours_logged}h)</span>
            </div>
            {s.department && (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-2 p-2 bg-gray-50 rounded-lg">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium truncate" title={s.department}>{s.department}</span>
              </div>
            )}
            {s.preceptor && (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium truncate" title={`${s.preceptor.name} — ${s.preceptor.title}`}>{s.preceptor.name} — {s.preceptor.title}</span>
              </div>
            )}
            {s.notes && (
              <div className="text-sm text-gray-700 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg line-clamp-2 leading-relaxed" title={s.notes}>{s.notes}</div>
            )}


            <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => openForm(s)}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 hover:border-[#0F3D73] focus:outline-none focus:ring-2 focus:ring-[#0F3D73] shadow-sm transition-all"
                aria-label="Edit shift"
                title="Edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L7.5 20.213 3 21l.787-4.5L16.862 4.487z" />
                </svg>
                <span className="sr-only">Edit</span>
              </button>
              <button
                onClick={() => confirmDelete(s.id)}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-300 shadow-sm transition-all"
                aria-label="Delete shift"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" />
                </svg>
                <span className="sr-only">Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
