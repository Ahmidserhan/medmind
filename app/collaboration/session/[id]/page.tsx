import Sidebar from "@/app/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SessionRoom from "./room";

export const dynamic = "force-dynamic";

export default async function SessionRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('collab_sessions')
    .select('id,title,description,visibility,scheduled_at')
    .eq('id', id)
    .single();

  if (error) {
    redirect('/collaboration?tab=planning');
  }

  const profile = await supabase.from('profiles').select('full_name,email').eq('id', user.id).single();
  const displayName = profile.data?.full_name || profile.data?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex">
      <Sidebar />
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 h-screen flex flex-col">
          <header className="shrink-0 p-4 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <a href="/collaboration?tab=planning" className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 transition-all group">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{data?.title || 'Session'}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Real-time collaboration</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-white to-gray-50 border border-gray-200 shadow-md hover:shadow-lg transition-all">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white text-sm sm:text-base font-bold shadow-md">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900 hidden sm:inline">{displayName}</span>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-hidden p-4">
            <SessionRoom sessionId={id} title={data?.title || 'Session'} userId={user.id} displayName={displayName} />
          </div>
        </div>
      </main>
    </div>
  );
}
