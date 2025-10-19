import Sidebar from "@/app/components/Sidebar";
import SwalNotifier from "@/app/components/SwalNotifier";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [assignmentsRes, examsRes, shiftsRes, eventsRes] = await Promise.all([
    supabase
      .from("assignments")
      .select("id,title,due_date,status,priority")
      .eq("user_id", user.id)
      .not("status", "eq", "Done")
      .order("due_date", { ascending: true })
      .limit(8),
    supabase
      .from("exams")
      .select("id,title,date,time,location")
      .eq("user_id", user.id)
      .gte("date", isoToday)
      .lte("date", in7)
      .order("date", { ascending: true })
      .limit(8),
    supabase
      .from("clinical_shifts")
      .select("id,date,start_time,end_time,site,department")
      .eq("user_id", user.id)
      .gte("date", isoToday)
      .lte("date", in7)
      .order("date", { ascending: true })
      .limit(8),
    supabase
      .from("calendar_events")
      .select("id,title,date,time,end_time,type,location")
      .eq("user_id", user.id)
      .eq("date", isoToday)
      .order("time", { ascending: true })
      .limit(12),
  ]);

  const fullName = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '').trim();
  const displayName = (fullName.split(' ')[0] || fullName.split('@')[0] || 'there');
  const initials = (fullName
    ? fullName.split(' ').map((s: string) => s[0]).slice(0,2).join('')
    : (user?.email?.split('@')[0]?.slice(0,2) || 'U')
  ).toUpperCase();

  const stats = {
    pendingAssignments: (assignmentsRes.data || []).length,
    upcomingExams: (examsRes.data || []).length,
    upcomingShifts: (shiftsRes.data || []).length,
    todayEvents: (eventsRes.data || []).length,
  };

  const progress = {
    pendingAssignments: Math.min(100, Math.round(((assignmentsRes.data || []).length / 8) * 100) || 0),
    upcomingExams: Math.min(100, Math.round(((examsRes.data || []).length / 8) * 100) || 0),
    upcomingShifts: Math.min(100, Math.round(((shiftsRes.data || []).length / 8) * 100) || 0),
    todayEvents: Math.min(100, Math.round(((eventsRes.data || []).length / 12) * 100) || 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] via-[#F3F4F6] to-[#E5E7EB] flex">
      <Sidebar />
      <main className="flex-1 p-4 overflow-y-auto">
        <SwalNotifier />
        <div className="space-y-6">
          
          <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0F3D73] via-[#0B2F59] to-[#082344] text-white shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-white to-gray-100 text-[#0F3D73] font-bold text-lg sm:text-xl shadow-lg">
                    {initials}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1">Welcome back, {displayName}</h1>
                    <p className="text-white/80 text-sm sm:text-base">Your personalized snapshot for the next 7 days</p>
                  </div>
                </div>
                <form
                  action={async () => {
                    'use server';
                    await logout();
                    redirect('/login');
                  }}
                >
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white shadow-lg transition-all"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Pending" value={String(stats.pendingAssignments)} progress={progress.pendingAssignments} accent="from-[#3AAFA9] to-[#2E8B85]" icon="tasks" />
            <StatCard label="Exams" value={String(stats.upcomingExams)} progress={progress.upcomingExams} accent="from-[#60A5FA] to-[#2563EB]" icon="exam" />
            <StatCard label="Shifts" value={String(stats.upcomingShifts)} progress={progress.upcomingShifts} accent="from-[#C084FC] to-[#7C3AED]" icon="shift" />
            <StatCard label="Today" value={String(stats.todayEvents)} progress={progress.todayEvents} accent="from-[#FBBF24] to-[#F59E0B]" icon="calendar" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#0F3D73] font-semibold">
                <SvgIcon name="calendar" className="w-5 h-5" />
                <span>Today&apos;s schedule</span>
              </div>
              <a href="/calendar" className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] text-[#0F3D73] hover:from-[#D6E8F9] hover:to-[#C2DDF7] font-medium transition-all shadow-sm">View all</a>
            </div>
            <WeekStrip baseDate={isoToday} />
            {((eventsRes.data || []).length === 0) ? (
              <div className="text-sm text-[#6B7280] mt-3">No events scheduled for today.</div>
            ) : (
              <ul className="divide-y divide-[#E5E7EB] mt-2">
                {(eventsRes.data || []).slice(0,6).map(e => (
                  <li key={e.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-[#2E3A59]">{e.title}</div>
                      <div className="text-xs text-[#6B7280]"><span className="font-medium text-[#0F3D73]">{formatDate(e.date)}</span> • {e.time || ''}{e.end_time ? ' - ' + e.end_time : ''}{e.location ? ' • ' + e.location : ''}</div>
                    </div>
                    {e.type && <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap self-start ${badgeClass(e.type)}`}>{e.type}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#0F3D73] font-semibold">
                <SvgIcon name="tasks" className="w-5 h-5" />
                <span>Pending assignments / tests</span>
              </div>
              <a href="/assignments" className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] text-[#0F3D73] hover:from-[#D6E8F9] hover:to-[#C2DDF7] font-medium transition-all shadow-sm">View all</a>
            </div>
            {((assignmentsRes.data || []).length === 0) ? (
              <div className="text-sm text-[#6B7280]">Nothing pending.</div>
            ) : (
              <ul className="divide-y divide-[#E5E7EB]">
                {(assignmentsRes.data || []).slice(0,6).map(a => (
                  <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-[#2E3A59]">{a.title}</div>
                      <div className="text-xs text-[#6B7280] flex items-center gap-2">
                        <span>Due <span className="font-medium text-[#0F3D73]">{formatDate(a.due_date)}</span></span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${dueMeta(a.due_date).cls}`}>{dueMeta(a.due_date).label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF2FB] text-[#0F3D73] whitespace-nowrap self-start">{a.status}</span>
                      <form action={async () => {
                        'use server';
                        const s = await createClient();
                        const { data: { user } } = await s.auth.getUser();
                        if (!user) return;
                        await s
                          .from('assignments')
                          .update({ status: 'Done' })
                          .eq('id', a.id)
                          .eq('user_id', user.id);
                        redirect('/dashboard?toast=done');
                      }}>
                        <button aria-label="Mark assignment done" className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-[#E5E7EB] hover:bg-[#F3F4F6]">
                          <SvgIcon name="check" className="w-3.5 h-3.5 text-[#0F3D73]" />
                          <span>Mark done</span>
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {
              (examsRes.data || []).length > 0 ? (
                <div className="mt-3">
                  <div className="text-xs font-medium text-[#0F3D73] mb-1">Upcoming exams (7 days)</div>
                  <ul className="space-y-1">
                    {(examsRes.data || []).map(x => (
                      <li key={x.id} className="text-xs text-[#4B5563]">{x.title} — {formatDate(x.date)} {x.time ? `• ${x.time}` : ''}</li>
                    ))}
                  </ul>
                </div>
              ) : null
            }
          </section>

          <Panel
            title="Upcoming clinical shifts"
            link="/clinicals"
            items={(shiftsRes.data || []).map(s => ({
              id: s.id,
              primary: `${formatDate(s.date)} • ${s.start_time}–${s.end_time}`,
              secondary: `${s.site} — ${s.department}`,
            }))}
            empty="No shifts in the next 7 days."
          />

          <Panel
            title="Priority tasks"
            link="/assignments"
            items={(assignmentsRes.data || [])
              .filter(a => a.priority === 'High' || a.priority === 'high' || a.priority === 'High Priority')
              .map(a => ({ id: a.id, primary: a.title, secondary: `Due ${formatDate(a.due_date)}`, badge: a.priority }))}
            empty="No high-priority tasks. Mark an assignment as High to have it appear here."
          />
          </div>
        </div>
      </main>
    </div>
  );
}

function Panel({ title, link, items, empty, extra }: { title: string; link: string; items: { id: string; primary: string; secondary?: string; badge?: string | null }[]; empty: string; extra?: React.ReactNode }) {
  return (
    <section className="relative bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
      <span className="absolute inset-x-0 -top-0.5 h-1 rounded-t-xl bg-gradient-to-r from-[#60A5FA] via-[#0F3D73] to-[#60A5FA] opacity-80"></span>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[#0F3D73] font-semibold text-base">{title}</div>
        <a href={link} className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] text-[#0F3D73] hover:from-[#D6E8F9] hover:to-[#C2DDF7] font-medium transition-all shadow-sm">View all</a>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-[#6B7280]">{empty}</div>
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {items.slice(0, 6).map((it) => (
            <li key={it.id} className="py-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-[#2E3A59]">{it.primary}</div>
                {it.secondary && <div className="text-xs text-[#6B7280]">{it.secondary}</div>}
              </div>
              {it.badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF2FB] text-[#0F3D73] whitespace-nowrap self-start">{it.badge}</span>}
            </li>
          ))}
        </ul>
      )}
      {extra}
    </section>
  );
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

function WeekStrip({ baseDate }: { baseDate: string }) {
  const base = new Date(baseDate);
  const today = new Date();
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  const days = Array.from({ length: 7 }).map((_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const isToday = dt.toDateString() === today.toDateString();
    return {
      key: i,
      label: dt.toLocaleDateString(undefined, { weekday: 'short' }),
      day: dt.getDate(),
      active: isToday,
    };
  });
  return (
    <div className="flex items-center gap-2 mb-2">
      {days.map(d => (
        <div
          key={d.key}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border transition shadow-sm ${d.active ? 'bg-[#EAF2FB] border-[#C8D7EA] text-[#0F3D73]' : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]'}`}
        >
          <div className="text-[11px]">{d.label}</div>
          <div className="text-sm font-medium">{d.day}</div>
        </div>
      ))}
    </div>
  );
}

function badgeClass(t: string) {
  const k = t.toLowerCase();
  if (k.includes('exam') || k === 'exam') return 'bg-[#FEF3C7] text-[#92400E]';
  if (k.includes('lecture') || k === 'lecture') return 'bg-[#DBEAFE] text-[#1D4ED8]';
  if (k.includes('clinical') || k === 'clinical') return 'bg-[#DCFCE7] text-[#166534]';
  return 'bg-[#E5E7EB] text-[#374151]';
}

function dueMeta(due: string) {
  try {
    const d = new Date(due);
    const today = new Date();
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dOnly < tOnly) return { label: 'Overdue', cls: 'text-[#991B1B] bg-[#FEE2E2]' };
    if (dOnly.getTime() === tOnly.getTime()) return { label: 'Today', cls: 'text-[#92400E] bg-[#FEF3C7]' };
    return { label: d.toLocaleDateString(), cls: 'text-[#1F2937] bg-[#E5E7EB]' };
  } catch {
    return { label: due, cls: 'text-[#1F2937] bg-[#E5E7EB]' };
  }
}

function SvgIcon({ name, className }: { name: 'calendar'|'tasks'|'exam'|'shift'|'check'; className?: string }) {
  if (name === 'calendar') return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3M16 2v3M3 9h18M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    </svg>
  );
  if (name === 'tasks') return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M5 12h14M5 17h8" />
    </svg>
  );
  if (name === 'exam') return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
  if (name === 'shift') return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StatCard({ label, value, accent, icon, progress }: { label: string; value: string; accent: string; icon: 'tasks'|'exam'|'shift'|'calendar'; progress?: number }) {
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all group">
      <span className={`absolute inset-x-0 -top-0.5 h-1 rounded-t-xl bg-gradient-to-r ${accent} opacity-80 group-hover:opacity-100 transition-opacity`}></span>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">{label}</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F3D73]">{value}</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 text-[#0F3D73] shadow-md">
          <SvgIcon name={icon} className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100" aria-label={`${label} progress`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
