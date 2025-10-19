"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function SidebarNav({ onNew }: { onNew?: () => void }) {
  const pathname = usePathname();
  const items = [
    { href: "/collaboration?tab=planning", label: "Group Planning", icon: CalendarIcon },
    { href: "/collaboration?tab=discuss", label: "Discussion Boards", icon: MessageIcon },
  ];
  return (
    <aside className="hidden lg:flex w-64 shrink-0 h-[calc(100vh-48px)] sticky top-12 flex-col border-r border-[#E5E7EB] bg-white/70 backdrop-blur-xl">
      <div className="p-4 text-xs uppercase tracking-wide text-[#6B7280]">Collaboration</div>
      <nav className="px-2 space-y-1">
        {items.map((it) => (
          <a key={it.href} href={it.href} className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition ${pathname.startsWith(it.href.split('?')[0]) ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'}`}>
            <it.icon className="w-4 h-4 text-[#0F3D73]" />
            <span className="text-sm text-[#2E3A59]">{it.label}</span>
          </a>
        ))}
      </nav>
      <div className="mt-auto p-3">
        <motion.button whileTap={{ scale: 0.98 }} onClick={onNew} className="w-full px-3 py-2 rounded-lg bg-[#40BD46] text-white hover:bg-[#36aa3b]">+ New</motion.button>
      </div>
    </aside>
  );
}

function CalendarIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3M16 2v3M3 9h18M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    </svg>
  );
}
function MessageIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v9z" />
    </svg>
  );
}
