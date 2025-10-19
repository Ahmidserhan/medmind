import Sidebar from "@/app/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CollaborationClient from "./ui";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collaboration Hub | MedMind',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export const dynamic = "force-dynamic";

export default async function CollaborationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await supabase.from('profiles').select('full_name,email').eq('id', user.id).single();
  const displayName = profile.data?.full_name || profile.data?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] via-[#F3F4F6] to-[#E5E7EB] flex">
      <Sidebar />
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          
          <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0F3D73] via-[#0B2F59] to-[#082344] text-white shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">Collaboration Hub</h1>
                  <p className="text-white/80 text-sm sm:text-base">Connect, plan, and collaborate with your study groups</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-white to-gray-100 flex items-center justify-center text-[#0F3D73] text-sm sm:text-base font-bold shadow-md">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm sm:text-base font-semibold text-white">{displayName}</span>
                </div>
              </div>
            </div>
          </div>

          <CollaborationClient />
        </div>
      </main>
    </div>
  );
}
