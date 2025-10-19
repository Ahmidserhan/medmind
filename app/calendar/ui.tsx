'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
  getEventsByMonth,
  createEvent,
  updateEvent,
  type CalendarEvent,
} from '@/app/actions/calendar';
import FullCalendar from '@fullcalendar/react';
import type { Assignment } from '@/app/actions/assignments';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

export default function CalendarClient() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [showAssignments, setShowAssignments] = useState(true);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formColor, setFormColor] = useState('#0F3D73');
  const [formDescription, setFormDescription] = useState('');

  const monthLabel = new Date(ym.y, ym.m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getEventsByMonth(ym.y, ym.m);
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Failed to load', text: res.error });
      } else {
        setItems(res.data);
      }
      try {
        const mod = await import('@/app/actions/assignments');
        const ares = await mod.getAssignments();
        if (!('error' in ares)) {
          const start = new Date(ym.y, ym.m, 1);
          const end = new Date(ym.y, ym.m + 1, 0);
          const filtered = ares.data.filter((a: Assignment) => {
            if (!a.due_date) return false;
            const d = new Date(a.due_date);
            return d >= start && d <= end;
          });
          setAssignments(filtered);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [ym.y, ym.m]);

  const types = useMemo(() => Array.from(new Set(items.map(i => i.type).filter(Boolean))) as string[], [items]);

  const filtered = useMemo(() =>
    items.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  , [items, typeFilter, query]);

  const openForm = (existing?: CalendarEvent, prefills?: Partial<CalendarEvent>) => {
    setEditing(existing || null);
    setFormTitle(existing?.title || prefills?.title || '');
    setFormDate(existing?.date || prefills?.date || new Date().toISOString().slice(0,10));
    setFormType(existing?.type || prefills?.type || '');
    setFormTime(existing?.time || prefills?.time || '');
    setFormEndTime(existing?.end_time || prefills?.end_time || '');
    setFormLocation(existing?.location || prefills?.location || '');
    setFormColor(existing?.color || prefills?.color || '#0F3D73');
    setFormDescription(existing?.description || prefills?.description || '');
    setShowModal(true);
  };

  const saveForm = async () => {
    const title = formTitle.trim();
    if (!title || !formDate) return;
    setSaving(true);
    const form = new FormData();
    form.append('title', title);
    form.append('date', formDate);
    form.append('type', formType);
    form.append('time', formTime);
    form.append('end_time', formEndTime);
    form.append('location', formLocation);
    form.append('description', formDescription);
    form.append('color', formColor);
    const res = editing ? await updateEvent(editing.id, form) : await createEvent(form);
    setSaving(false);
    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      return;
    }
    setItems(prev => editing ? prev.map(i => i.id === res.data.id ? res.data : i) : [...prev, res.data]);
    setShowModal(false);
  };

  // (Delete handler currently unused)

  const prevMonth = () => {
    const api = calendarRef.current?.getApi();
    api?.prev();
  };
  const nextMonth = () => {
    const api = calendarRef.current?.getApi();
    api?.next();
  };

  const fcEventsBase = filtered.map(e => {
    const start = e.time ? `${e.date}T${e.time}` : e.date;
    const end = e.end_time ? `${e.date}T${e.end_time}` : undefined;
    return { id: e.id, title: e.title, start, end, backgroundColor: e.color || '#0F3D73', borderColor: e.color || '#0F3D73' };
  });

  const priorityColor = (p?: string) => {
    if (!p) return { bg: '#64748B' };
    const k = String(p).toLowerCase();
    if (k === 'high') return { bg: '#DC2626' };
    if (k === 'medium') return { bg: '#D97706' };
    if (k === 'low') return { bg: '#16A34A' };
    return { bg: '#64748B' };
  };

  const assignmentEvents = (showAssignments ? assignments : []).map(a => {
    const col = priorityColor(a.priority).bg;
    return {
      id: `a-${a.id}`,
      title: `Assignment: ${a.title}`,
      start: a.due_date,
      backgroundColor: col,
      borderColor: col,
    };
  });

  const fcEvents = [...fcEventsBase, ...assignmentEvents];

  if (loading) return (
    <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center shadow-lg">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#0F3D73] mb-4"></div>
      <div className="text-gray-600 font-medium">Loading events...</div>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click a date to add an event or drag to select a range
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
              New Event
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
              placeholder="Search by title, location, description..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white font-medium transition-all" value={typeFilter} onChange={(e)=> setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-all">
              <input type="checkbox" className="w-4 h-4 accent-[#0F3D73] cursor-pointer" checked={showAssignments} onChange={(e)=>setShowAssignments(e.target.checked)} />
              <span className="text-sm font-medium text-gray-700">Show assignments</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek', center: '', right: 'prev,next today' }}
          height={750}
          selectable
          selectMirror
          dayMaxEventRows
          events={fcEvents}
          eventDisplay="block"
          datesSet={(arg) => {
            type DatesArg = { view?: { currentStart: Date } } | { start: Date };
            const a = arg as DatesArg;
            const d = 'view' in a && a.view ? a.view.currentStart : (a as { start: Date }).start;
            const y = d.getFullYear();
            const m = d.getMonth();
            setYm({ y, m });
          }}
          dateClick={(info) => {
            type DateClick = { dateStr: string };
            const d = (info as DateClick).dateStr;
            openForm(undefined, { date: d });
          }}
          select={(sel) => {
            type DateSelect = { startStr: string };
            const start = (sel as DateSelect).startStr;
            openForm(undefined, { date: start });
          }}
          eventClick={(arg) => {
            type EventClick = { event?: { id: string } };
            const e = items.find(i => i.id === (arg as EventClick).event?.id);
            if (e) openForm(e);
          }}
          eventColor="#0F3D73"
          eventTextColor="#fff"
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowModal(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] flex items-center justify-between">
              <div className="text-white font-bold text-lg">{editing ? 'Edit Event' : 'New Event'}</div>
              <button onClick={()=>setShowModal(false)} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Title</label>
                <input value={formTitle} onChange={(e)=>setFormTitle(e.target.value)} className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${formTitle.trim()? 'border-gray-200 focus:ring-[#0F3D73] focus:border-[#0F3D73]':'border-red-300 focus:ring-red-400'}`} placeholder="e.g., Pharmacology lecture" autoFocus />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Date</label>
                  <input type="date" value={formDate} min={new Date().toISOString().slice(0,10)} onChange={(e)=>setFormDate(e.target.value)} className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${formDate? 'border-gray-200 focus:ring-[#0F3D73] focus:border-[#0F3D73]':'border-red-300 focus:ring-red-400'}`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Type</label>
                  <input value={formType} onChange={(e)=>setFormType(e.target.value)} placeholder="e.g., lecture" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Start time</label>
                  <input type="time" value={formTime} onChange={(e)=>setFormTime(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">End time</label>
                  <input type="time" value={formEndTime} onChange={(e)=>setFormEndTime(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                  <input value={formLocation} onChange={(e)=>setFormLocation(e.target.value)} placeholder="e.g., Room 203" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Color</label>
                  <input type="color" value={formColor} onChange={(e)=>setFormColor(e.target.value)} className="w-full h-12 px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                <textarea value={formDescription} onChange={(e)=>setFormDescription(e.target.value)} rows={4} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" placeholder="Add event details..." />
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Leave times empty for all-day events
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="px-5 py-2.5 rounded-xl border-2 border-gray-300 hover:bg-gray-100 font-semibold transition-all">Cancel</button>
              <button onClick={saveForm} disabled={saving || !formTitle.trim() || !formDate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md">{saving ? 'Saving...' : 'Save Event'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
