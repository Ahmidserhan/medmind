import Sidebar from "@/app/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "./ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] via-[#F3F4F6] to-[#E5E7EB] flex">
      <Sidebar />
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          
          <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0F3D73] via-[#0B2F59] to-[#082344] text-white shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Settings</h1>
              <p className="text-white/80 text-sm sm:text-base">Customize your MedMind experience</p>
            </div>
          </div>

          <SettingsClient />
        </div>
      </main>
    </div>
  );
}
