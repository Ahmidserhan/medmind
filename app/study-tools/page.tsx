import Sidebar from "@/app/components/Sidebar";
import PomodoroTimer from "./PomodoroTimer";
import TodoList from "./TodoList";
import NoteTaking from "./NoteTaking";

export const dynamic = "force-dynamic";

export default function StudyToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] via-[#F3F4F6] to-[#E5E7EB] flex">
      <Sidebar />
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          
          <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0F3D73] via-[#0B2F59] to-[#082344] text-white shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Study Tools</h1>
              <p className="text-white/80 text-sm sm:text-base">Pomodoro timer, notes, and to-dos to boost your productivity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6 items-start">
            <div className="space-y-5 sm:space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-[#0F3D73]">Pomodoro Timer</h2>
                </div>
                <PomodoroTimer />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-[#0F3D73]">To-Do List</h2>
                </div>
                <TodoList />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-[#0F3D73]">Quick Notes</h2>
              </div>
              <NoteTaking />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
